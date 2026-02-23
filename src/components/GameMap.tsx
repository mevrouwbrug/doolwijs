"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { LevelGrid, Position } from "@/lib/types";
import { LEVEL_1, GRID_SIZE } from "@/lib/levelData";
import { QuestionModal } from "./QuestionModal";

/** Koppeling van grid-nummers aan sprite-URL's (placeholder tot echte pixel-art) */
const TILE_ASSETS: Record<number, string> = {
  0: "https://placehold.co/64x64/3f3f3f/png?text=.",
  1: "https://placehold.co/64x64/6b7280/png?text=Muur",
  2: "https://placehold.co/64x64/3b82f6/png?text=Hero",
  3: "https://placehold.co/64x64/eab308/png?text=Deur",
  4: "https://placehold.co/64x64/f59e0b/png?text=Key",
  5: "https://placehold.co/64x64/22c55e/png?text=Exit",
};

const TILE_SIZE = 64;

function createInitialMap(): LevelGrid {
  return LEVEL_1.map((row) => [...row]);
}

function findPlayerStart(grid: LevelGrid): Position {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 2) return { row: r, col: c };
    }
  }
  return { row: 1, col: 1 };
}

export function GameMap() {
  const [map, setMap] = useState<LevelGrid>(createInitialMap);
  const [player, setPlayer] = useState<Position>(() => findPlayerStart(LEVEL_1));
  const [modalOpen, setModalOpen] = useState(false);
  const [terminalCell, setTerminalCell] = useState<Position | null>(null);

  const handleTerminalAnswer = useCallback(
    (correct: boolean) => {
      setModalOpen(false);
      if (correct && terminalCell) {
        setMap((prev) => {
          const next = prev.map((row) => [...row]);
          next[terminalCell.row][terminalCell.col] = 0;
          return next;
        });
      }
      setTerminalCell(null);
    },
    [terminalCell]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (modalOpen) return;

      const key = e.key;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key))
        return;
      e.preventDefault();

      let dRow = 0;
      let dCol = 0;
      if (key === "ArrowUp") dRow = -1;
      if (key === "ArrowDown") dRow = 1;
      if (key === "ArrowLeft") dCol = -1;
      if (key === "ArrowRight") dCol = 1;

      const newRow = player.row + dRow;
      const newCol = player.col + dCol;

      if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE)
        return;

      const cell = map[newRow][newCol];

      if (cell === 1) return; // muur: geen beweging

      if (cell === 3) {
        // deur/terminal: open modal, beweeg niet
        setTerminalCell({ row: newRow, col: newCol });
        setModalOpen(true);
        return;
      }

      setPlayer({ row: newRow, col: newCol });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, map, modalOpen]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 font-opendyslexic">
      <h1 className="text-2xl font-bold text-slate-800">Doolwijs – Level 1</h1>
      <p className="text-slate-600">Gebruik de pijltjestoetsen om te bewegen.</p>

      <div
        className="grid gap-0 rounded-lg overflow-hidden border-4 border-slate-700 shadow-lg"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`,
        }}
      >
        {map.map((row, r) =>
          row.map((tile, c) => {
            const isPlayer = player.row === r && player.col === c;
            const displayTile = isPlayer ? 2 : tile;
            const src = TILE_ASSETS[displayTile] ?? TILE_ASSETS[0];
            return (
              <div
                key={`${r}-${c}`}
                className="relative flex items-center justify-center bg-slate-200"
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
              >
                <Image
                  src={src}
                  alt={
                    isPlayer
                      ? "Speler"
                      : tile === 0
                        ? "Vloer"
                        : tile === 1
                          ? "Muur"
                          : tile === 3
                            ? "Deur"
                            : tile === 4
                              ? "Sleutel"
                              : tile === 5
                                ? "Uitgang"
                                : "Tegel"
                  }
                  width={TILE_SIZE}
                  height={TILE_SIZE}
                  className="block"
                  unoptimized
                />
              </div>
            );
          })
        )}
      </div>

      <QuestionModal isOpen={modalOpen} onAnswer={handleTerminalAnswer} />
    </div>
  );
}
