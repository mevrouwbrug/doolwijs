"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelGrid, Position, CurrentQuestion } from "@/lib/types";
import { LEVEL_1, GRID_SIZE } from "@/lib/levelData";
import { QuizModal } from "./QuizModal";

/** Paden naar afbeeldingen in public/Tilemap/ (Next.js serveert public/ vanaf /) */
const TILE_ASSETS: Record<number, string> = {
  0: "/Tilemap/floor.png",
  1: "/Tilemap/wall.png",
  2: "/Tilemap/floor.png",
  3: "/Tilemap/door_closed.png",
  4: "/Tilemap/floor.png",
  5: "/Tilemap/exit.png",
};

const HERO_SRC = "/Tilemap/hero.png";

/** Fallbackkleuren als afbeelding niet laadt (geen kapotte iconen) */
const TILE_FALLBACK_COLORS: Record<number, string> = {
  0: "bg-amber-100",
  1: "bg-slate-600",
  2: "bg-amber-100",
  3: "bg-amber-700",
  4: "bg-amber-200",
  5: "bg-green-400",
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
  const [currentQuestion] = useState<CurrentQuestion>(DEFAULT_QUESTION);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [terminalCell, setTerminalCell] = useState<Position | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  const handleTerminalAnswer = useCallback(
    (correct: boolean) => {
      if (correct && terminalCell) {
        setIsModalOpen(false);
        setMap((prev) => {
          const next = prev.map((row) => [...row]);
          next[terminalCell.row][terminalCell.col] = 0;
          return next;
        });
        setTerminalCell(null);
      } else {
        setFeedbackMessage(currentQuestion.feedbackBijFout);
      }
    },
    [terminalCell, currentQuestion.feedbackBijFout]
  );

  useEffect(() => {
    if (feedbackMessage === "") return;
    const t = setTimeout(() => {
      setFeedbackMessage("");
      setIsModalOpen(false);
      setTerminalCell(null);
    }, 2000);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

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
            const fallbackClass = TILE_FALLBACK_COLORS[cell] ?? TILE_FALLBACK_COLORS[0];
            return (
              <div
                key={`${r}-${c}`}
                className={`relative flex items-center justify-center overflow-hidden ${fallbackClass}`}
                style={{ width: TILE_SIZE, height: TILE_SIZE }}
              >
                <img
                  src={TILE_ASSETS[cell] || TILE_ASSETS[0]}
                  alt=""
                  className="w-full h-full object-cover pixelated"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {isPlayer && (
                  <img
                    src={HERO_SRC}
                    alt=""
                    className="absolute top-0 left-0 w-full h-full object-cover z-10 pixelated"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
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
        feedbackMessage={feedbackMessage}
        onAnswer={handleTerminalAnswer}
      />
    </div>
  );
}
