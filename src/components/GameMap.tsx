"use client";

import { useCallback, useEffect, useState } from "react";
import type { LevelGrid, Position } from "@/lib/types";
import { LEVEL_1, GRID_SIZE, TILE_SIZE_PX } from "@/lib/levelData";
import { QuestionModal } from "./QuestionModal";

const TILE_STYLES: Record<number, string> = {
  0: "bg-emerald-500",           // vloer
  1: "bg-slate-600",             // muur
  2: "bg-emerald-500",           // speler start (tegel wordt vloer getoond)
  3: "bg-amber-800",             // deur/terminal
  4: "bg-amber-400",             // sleutel
  5: "bg-green-400",             // uitgang
};

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
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE_PX}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE_PX}px)`,
        }}
      >
        {map.map((row, r) =>
          row.map((tile, c) => {
            const isPlayer = player.row === r && player.col === c;
            const displayTile = isPlayer ? 0 : tile;
            const style = TILE_STYLES[displayTile] ?? "bg-emerald-500";
            return (
              <div
                key={`${r}-${c}`}
                className={`flex items-center justify-center ${style}`}
                style={{ width: TILE_SIZE_PX, height: TILE_SIZE_PX }}
              >
                {isPlayer && (
                  <div
                    className="h-8 w-8 rounded-full bg-blue-600 shadow-md"
                    aria-hidden
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <QuestionModal isOpen={modalOpen} onAnswer={handleTerminalAnswer} />
    </div>
  );
}
