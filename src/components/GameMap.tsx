"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelGrid, Position, CurrentQuestion } from "@/lib/types";
import { LEVEL_1, GRID_SIZE } from "@/lib/levelData";
import { QuizModal } from "./QuizModal";

/** Paden naar afbeeldingen in public/Tilemap/ */
const tileAssets: Record<number, string> = {
  0: "/Tilemap/floor.png",
  1: "/Tilemap/wall.png",
  2: "/Tilemap/floor.png",
  3: "/Tilemap/door_closed.png",
  4: "/Tilemap/floor.png",
  5: "/Tilemap/exit.png",
};

const TILE_SIZE = 64;

/** Dummy-vraag voor de Hack Terminal (taalverzorging) */
const DEFAULT_QUESTION: CurrentQuestion = {
  vraag: "Welke zin is juist geschreven?",
  opties: [
    { id: "A", text: "Hij vind de game leuk.", correct: false },
    { id: "B", text: "Hij vindt de game leuk.", correct: true },
    { id: "C", text: "Hij vinddt de game leuk.", correct: false },
    { id: "D", text: "Hij vinden de game leuk.", correct: false },
  ],
  correctAntwoord: "B",
  feedbackBijFout: "Fout! Denk aan stam + t.",
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [terminalCell, setTerminalCell] = useState<Position | null>(null);
  const [currentQuestion] = useState<CurrentQuestion>(DEFAULT_QUESTION);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  const handleTerminalAnswer = useCallback(
    (correct: boolean) => {
      if (correct && terminalCell) {
        setIsModalOpen(false);
        setFeedback("");
        setMap((prev) => {
          const next = prev.map((row) => [...row]);
          next[terminalCell.row][terminalCell.col] = 0;
          return next;
        });
        setTerminalCell(null);
      } else {
        setFeedback("Fout! Denk aan stam + t.");
      }
    },
    [terminalCell]
  );

  useEffect(() => {
    if (feedback === "") return;
    const t = setTimeout(() => {
      setFeedback("");
      setIsModalOpen(false);
      setTerminalCell(null);
    }, 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isModalOpen) return;

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

      if (cell === 1) return;

      if (cell === 3) {
        setTerminalCell({ row: newRow, col: newCol });
        setIsModalOpen(true);
        return;
      }

      setPlayer({ row: newRow, col: newCol });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, map, isModalOpen]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 font-opendyslexic">
      <h1 className="text-2xl font-bold text-slate-800">Doolwijs – Level 1</h1>
      <p className="text-slate-600">
        Klik op het speelveld en gebruik daarna de pijltjestoetsen om te bewegen. Loop naar de deur voor een taak.
      </p>

      <div
        ref={gridRef}
        tabIndex={0}
        role="application"
        aria-label="Speelveld: gebruik pijltjestoetsen om te bewegen"
        className="grid gap-0 rounded-lg overflow-hidden border-4 border-slate-700 shadow-lg outline-none ring-2 ring-transparent focus:ring-blue-500 focus:ring-offset-2"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`,
        }}
      >
        {map.map((row, r) =>
          row.map((tile, c) => {
            const isPlayer = player.row === r && player.col === c;
            const cell = isPlayer ? 0 : tile;
            return (
              <div
                key={`${r}-${c}`}
                className="relative flex items-center justify-center overflow-hidden bg-slate-200"
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
              >
                <img
                  src={tileAssets[cell] || tileAssets[0]}
                  alt="tile"
                  className="w-full h-full object-cover"
                />
                {isPlayer && (
                  <img
                    src="/Tilemap/hero.png"
                    alt="hero"
                    className="absolute top-0 left-0 w-full h-full object-cover z-10"
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <QuizModal
        isOpen={isModalOpen}
        question={currentQuestion}
        feedback={feedback}
        onAnswer={handleTerminalAnswer}
      />
    </div>
  );
}
