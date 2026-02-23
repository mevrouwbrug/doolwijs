"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { LevelGrid, Position, CurrentQuestion } from "@/lib/types";
import { LEVEL_1, GRID_SIZE } from "@/lib/levelData";
import { QuizModal } from "./QuizModal";

/** Koppeling van grid-nummers aan lokale sprites in /Tilemap/Tiles */
const TILE_ASSETS: Record<number, string> = {
  0: "/Tilemap/Tiles/tile_0000.png",
  1: "/Tilemap/Tiles/tile_0001.png",
  2: "/Tilemap/Tiles/tile_0002.png",
  3: "/Tilemap/Tiles/tile_0003.png",
  4: "/Tilemap/Tiles/tile_0004.png",
  5: "/Tilemap/Tiles/tile_0005.png",
};

const TILE_SIZE = 64;

/** Dummy-vraag voor de deur/terminal (taalverzorging) */
const DEFAULT_QUESTION: CurrentQuestion = {
  vraag: "Welke zin is juist?",
  opties: [
    { id: "A", text: "De hond loop in de tuin.", correct: false },
    { id: "B", text: "De hond loopt in de tuin.", correct: true },
    { id: "C", text: "De hond lopen in de tuin.", correct: false },
    { id: "D", text: "De hond loopt in de tuin", correct: false },
  ],
  correctAntwoord: "B",
  feedbackBijFout: "Fout! Denk aan 't kofschip.",
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
    }, 3000);
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
                />
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
