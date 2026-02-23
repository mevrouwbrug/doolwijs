"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelGrid, Position, CurrentQuestion } from "@/lib/types";
import { getLevelGrid, GRID_SIZE_MAZE } from "@/lib/levelData";
import { fetchQuestion } from "@/lib/quizApi";
import { QuizModal } from "./QuizModal";

/** Paden naar afbeeldingen in public/Tilemap/ – alleen <img> tags, geen Next.js Image */
const tileAssets: Record<number, string> = {
  0: "/Tilemap/floor.png",
  1: "/Tilemap/wall.png",
  2: "/Tilemap/floor.png",
  3: "/Tilemap/door_closed.png",
  4: "/Tilemap/floor.png",
  5: "/Tilemap/exit.png",
};

const TILE_SIZE = 64;

/** Fallback als de LLM-API niet beschikbaar is */
const questionBank: CurrentQuestion[] = [
  {
    vraag: "Welke zin is juist geschreven?",
    opties: [
      { id: "A", text: "Hij vind de game leuk.", correct: false },
      { id: "B", text: "Hij vindt de game leuk.", correct: true },
      { id: "C", text: "Hij vinddt de game leuk.", correct: false },
      { id: "D", text: "Hij vinden de game leuk.", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Fout! Denk aan stam + t.",
  },
  {
    vraag: "Welk woord hoort in de zin? De kinderen ... in de tuin.",
    opties: [
      { id: "A", text: "speelt", correct: false },
      { id: "B", text: "spelen", correct: true },
      { id: "C", text: "spelt", correct: false },
      { id: "D", text: "speel", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Fout! Het onderwerp is 'de kinderen' (meervoud).",
  },
  {
    vraag: "Welke spelling is correct?",
    opties: [
      { id: "A", text: "het reizen", correct: false },
      { id: "B", text: "het reizen (beide goed)", correct: false },
      { id: "C", text: "reizen", correct: false },
      { id: "D", text: "het reizen / reizen", correct: true },
    ],
    correctAntwoord: "D",
    feedbackBijFout: "Fout! Bij 'het' kan zowel 'het reizen' als 'reizen'.",
  },
  {
    vraag: "Kies de juiste werkwoordsvorm: Zij ... gisteren naar school.",
    opties: [
      { id: "A", text: "fietste", correct: false },
      { id: "B", text: "fietsten", correct: false },
      { id: "C", text: "fietst", correct: false },
      { id: "D", text: "fietste (enkelvoud) / fietsten (meervoud)", correct: true },
    ],
    correctAntwoord: "D",
    feedbackBijFout: "Fout! Let op enkelvoud vs meervoud.",
  },
  {
    vraag: "Welke zin heeft de juiste interpunctie?",
    opties: [
      { id: "A", text: "Wat doe je. vandaag?", correct: false },
      { id: "B", text: "Wat doe je vandaag?", correct: true },
      { id: "C", text: "Wat doe je vandaag.", correct: false },
      { id: "D", text: "wat doe je vandaag?", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Fout! Geen punt midden in de zin; wel vraagteken aan het eind.",
  },
];

function createInitialMap(level: number): LevelGrid {
  return getLevelGrid(level);
}

function findPlayerStart(grid: LevelGrid): Position {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 2) return { row: r, col: c };
    }
  }
  return { row: 1, col: 1 };
}

function getRandomQuestion(): CurrentQuestion {
  return questionBank[Math.floor(Math.random() * questionBank.length)];
}

interface GameMapProps {
  currentWorld: number;
  currentLevel: number;
  onLevelComplete: () => void;
  onWorldComplete: () => void;
  onGoHome: () => void;
}

export function GameMap({
  currentWorld,
  currentLevel,
  onLevelComplete,
  onWorldComplete,
  onGoHome,
}: GameMapProps) {
  const baseGrid = getLevelGrid(currentLevel);
  const [map, setMap] = useState<LevelGrid>(() => createInitialMap(currentLevel));
  const [player, setPlayer] = useState<Position>(() => findPlayerStart(baseGrid));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [terminalCell, setTerminalCell] = useState<Position | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [lastAnswerWasWrong, setLastAnswerWasWrong] = useState(false);
  const [levelMessage, setLevelMessage] = useState("");
  const [levelMessageType, setLevelMessageType] = useState<"success" | "warning">("success");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = getLevelGrid(currentLevel);
    setMap(grid);
    setPlayer(findPlayerStart(grid));
  }, [currentLevel]);

  useEffect(() => {
    gridRef.current?.focus();
  }, [currentLevel]);

  useEffect(() => {
    if (levelMessage === "") return;
    const t = setTimeout(() => setLevelMessage(""), 2500);
    return () => clearTimeout(t);
  }, [levelMessage]);

  const handleTerminalAnswer = useCallback(
    (correct: boolean) => {
      if (correct && terminalCell) {
        setLastAnswerWasWrong(false);
        setIsModalOpen(false);
        setFeedback("");
        setMap((prev) => {
          const next = prev.map((row) => [...row]);
          next[terminalCell.row][terminalCell.col] = 0;
          return next;
        });
        setTerminalCell(null);
        setCurrentQuestion(null);
      } else {
        setLastAnswerWasWrong(true);
        setFeedback(currentQuestion?.feedbackBijFout ?? "Fout! Denk aan stam + t.");
      }
    },
    [terminalCell, currentQuestion]
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

      if (newRow < 0 || newRow >= GRID_SIZE_MAZE || newCol < 0 || newCol >= GRID_SIZE_MAZE)
        return;

      const cell = map[newRow][newCol];

      if (cell === 1) return;

      if (cell === 3) {
        setTerminalCell({ row: newRow, col: newCol });
        setCurrentQuestion(null);
        setQuestionLoading(true);
        setIsModalOpen(true);
        const niveau = currentLevel <= 2 ? "1F" : "2F";
        fetchQuestion({ niveau, easier: lastAnswerWasWrong })
          .then((q) => {
            setCurrentQuestion(q ?? getRandomQuestion());
          })
          .catch(() => setCurrentQuestion(getRandomQuestion()))
          .finally(() => setQuestionLoading(false));
        return;
      }

      if (cell === 5) {
        const hasClosedDoors = map.some((row) => row.some((t) => t === 3));
        if (hasClosedDoors) {
          setLevelMessageType("warning");
          setLevelMessage("Maak eerst alle opdrachten voordat je naar de uitgang gaat!");
          return;
        }
        if (currentLevel < 5) {
          const nextLevel = currentLevel + 1;
          onLevelComplete();
          setMap(getLevelGrid(nextLevel));
          setPlayer(findPlayerStart(getLevelGrid(nextLevel)));
          setLevelMessageType("success");
          setLevelMessage(`Level ${currentLevel} voltooid! Door naar level ${nextLevel}.`);
        } else {
          window.alert("Wereld Gehaald!");
          onWorldComplete();
        }
        return;
      }

      setPlayer({ row: newRow, col: newCol });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, map, isModalOpen, currentLevel, lastAnswerWasWrong, onLevelComplete, onWorldComplete]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 font-opendyslexic">
      <div className="flex w-full max-w-[calc(12*64px)] items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Wereld {currentWorld}, Level {currentLevel}
        </h1>
        <button
          type="button"
          onClick={onGoHome}
          className="rounded-lg bg-slate-600 px-4 py-2 text-lg font-bold text-white transition hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Home
        </button>
      </div>
      {levelMessage && (
        <p
          className={`rounded-lg px-4 py-2 text-lg font-medium ${
            levelMessageType === "warning"
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {levelMessage}
        </p>
      )}
      <p className="text-slate-600">
        Klik op het speelveld en gebruik de pijltjestoetsen. Loop naar de deur voor een taak, daarna naar de uitgang.
      </p>

      <div
        ref={gridRef}
        tabIndex={0}
        role="application"
        aria-label="Speelveld: gebruik pijltjestoetsen om te bewegen"
        className="grid gap-0 rounded-lg overflow-hidden border-4 border-slate-700 shadow-lg outline-none ring-2 ring-transparent focus:ring-blue-500 focus:ring-offset-2"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE_MAZE}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE_MAZE}, ${TILE_SIZE}px)`,
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
        questionLoading={questionLoading}
        feedback={feedback}
        onAnswer={handleTerminalAnswer}
      />
    </div>
  );
}
