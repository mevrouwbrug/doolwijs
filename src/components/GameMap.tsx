"use client";

/* eslint-disable @next/next/no-img-element -- bewust <img> voor Tilemap/hero assets */
import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelGrid, Position, CurrentQuestion } from "@/lib/types";
import { getLevelGrid, GRID_SIZE_MAZE } from "@/lib/levelData";
import { fetchQuestionsForLevel } from "@/lib/quizApi";
import { getGlobalShown, addToGlobalShown } from "@/lib/globalShown";
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

/** Fallback als de LLM-API niet beschikbaar is. Alle vragen herleidbaar naar DIA/referentiekader:
 * 1–2: 1F (stam+t, persoonsvorm, jij-vraag). 3–5: 2F (verleden tijd, voltooid deelwoord, lastiger).
 * Vraagstelling en onderwerpen sluiten aan bij taalverzorging basisschool groep 7. */
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
    feedbackBijFout: "Kijk naar het onderwerp: wie doet het? Bij 'hij' of 'zij' komt er vaak een t achter de stam. Wat is de ik-vorm van dit werkwoord?",
  },
  {
    vraag: "Welk woord past in de zin? De kinderen ... in de tuin.",
    opties: [
      { id: "A", text: "speelt", correct: false },
      { id: "B", text: "spelen", correct: true },
      { id: "C", text: "speel", correct: false },
      { id: "D", text: "spelt", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Tel het onderwerp: is het één persoon of meer? Bij meervoud hoort een andere vorm. Zet 'de kinderen' in je hoofd even om naar 'zij'.",
  },
  {
    vraag: "Welke zin is juist geschreven?",
    opties: [
      { id: "A", text: "Gisteren wandel ik naar school.", correct: false },
      { id: "B", text: "Gisteren wandelde ik naar school.", correct: true },
      { id: "C", text: "Gisteren wandelt ik naar school.", correct: false },
      { id: "D", text: "Gisteren wandelen ik naar school.", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Gisteren = verleden tijd. Zoek de stam (ik-vorm) en denk aan de regel van 't kofschip. Eindigt de stam op een van die letters?",
  },
  {
    vraag: "Welke zin is juist geschreven?",
    opties: [
      { id: "A", text: "Zij werkt elke dag hard.", correct: true },
      { id: "B", text: "Zij werk elke dag hard.", correct: false },
      { id: "C", text: "Zij werken elke dag hard.", correct: false },
      { id: "D", text: "Zij werkte elke dag hard.", correct: false },
    ],
    correctAntwoord: "A",
    feedbackBijFout: "Bij 'zij' (één persoon) hoort één werkwoord. Wat is de stam? Komt er in de tegenwoordige tijd een t achter of niet?",
  },
  {
    vraag: "Welke zin heeft een fout?",
    opties: [
      { id: "A", text: "Wat doe je vandaag?", correct: false },
      { id: "B", text: "Hij doet zijn huiswerk.", correct: false },
      { id: "C", text: "Doet jij je jas aan?", correct: true },
      { id: "D", text: "Zij doet de deur open.", correct: false },
    ],
    correctAntwoord: "C",
    feedbackBijFout: "In een vraag staat 'jij' soms achter het werkwoord. Als jij achter de stam staat, schrijf je geen extra t. Zeg de zin hardop: klinkt het als 'doe' of 'doet'?",
  },
  {
    vraag: "Welk woord past in de zin? Mijn broer ... graag voetbal.",
    opties: [
      { id: "A", text: "speel", correct: false },
      { id: "B", text: "speelt", correct: true },
      { id: "C", text: "spelen", correct: false },
      { id: "D", text: "speelden", correct: false },
    ],
    correctAntwoord: "B",
    feedbackBijFout: "Het onderwerp is 'mijn broer' – dat is één persoon. Welke werkwoordsvorm hoort daarbij?",
  },
  {
    vraag: "Welke zin is juist?",
    opties: [
      { id: "A", text: "Ik loop elke dag naar school.", correct: true },
      { id: "B", text: "Ik loopt elke dag naar school.", correct: false },
      { id: "C", text: "Ik lopen elke dag naar school.", correct: false },
      { id: "D", text: "Ik loopte elke dag naar school.", correct: false },
    ],
    correctAntwoord: "A",
    feedbackBijFout: "Bij 'ik' hoort geen t achter de stam. Wat is de ik-vorm van dit werkwoord?",
  },
  {
    vraag: "Welk woord past in de zin? Gisteren ... ik naar de winkel.",
    opties: [
      { id: "A", text: "loop", correct: false },
      { id: "B", text: "loopt", correct: false },
      { id: "C", text: "liep", correct: true },
      { id: "D", text: "lopen", correct: false },
    ],
    correctAntwoord: "C",
    feedbackBijFout: "Gisteren = verleden tijd. Zoek de stam en denk aan de regel van 't kofschip.",
  },
  {
    vraag: "Welke zin is fout geschreven?",
    opties: [
      { id: "A", text: "De hond blaft heel hard.", correct: false },
      { id: "B", text: "De hond blaft soms zachtjes.", correct: false },
      { id: "C", text: "De honden blaft heel hard.", correct: true },
      { id: "D", text: "De honden blaffen heel hard.", correct: false },
    ],
    correctAntwoord: "C",
    feedbackBijFout: "Kijk naar het onderwerp: enkelvoud of meervoud? Dan past het werkwoord daarop.",
  },
  {
    vraag: "Welk woord hoort in de zin? Zij ... haar kamer op.",
    opties: [
      { id: "A", text: "ruimt", correct: true },
      { id: "B", text: "ruim", correct: false },
      { id: "C", text: "ruimen", correct: false },
      { id: "D", text: "ruimd", correct: false },
    ],
    correctAntwoord: "A",
    feedbackBijFout: "Bij 'zij' komt er een t achter de stam. Wat is de ik-vorm van dit werkwoord?",
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

/** Unieke vingerafdruk van een vraag (vraag + optieteksten), zodat geen twee dezelfde tellen. */
function questionFingerprint(q: CurrentQuestion): string {
  const optieTexts = q.opties.map((o) => o.text).sort().join("|");
  return `${q.vraag.trim()}\n${optieTexts}`;
}

/** Kies een willekeurige vraag uit de bank die nog NIET globaal is getoond. Als alle bank-vragen zijn gebruikt, kies random (nood-fallback). */
function getRandomQuestion(excludeFingerprints: string[]): CurrentQuestion {
  const available = questionBank.filter(
    (q) => !excludeFingerprints.includes(questionFingerprint(q))
  );
  const pool = available.length > 0 ? available : questionBank;
  return pool[Math.floor(Math.random() * pool.length)];
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
  const [lastAnswerWasWrong, setLastAnswerWasWrong] = useState(false);
  const [levelMessage, setLevelMessage] = useState("");
  const [levelMessageType, setLevelMessageType] = useState<"success" | "warning">("success");
  const gridRef = useRef<HTMLDivElement>(null);
  /** Per deur-positie: de vraag die er bij hoort (zelfde vraag tot correct beantwoord). Gevuld bij level-start. */
  const doorQuestions = useRef<Map<string, CurrentQuestion>>(new Map());
  const [levelQuestionsLoading, setLevelQuestionsLoading] = useState(true);

  // Bij elk nieuw level: laad het grid en genereer ALLE vragen voor dat level in één keer.
  useEffect(() => {
    let cancelled = false;
    const grid = getLevelGrid(currentLevel);
    setMap(grid);
    setPlayer(findPlayerStart(grid));
    doorQuestions.current = new Map();
    setLevelQuestionsLoading(true);

    // Zoek alle deurposities in dit level
    const doorPositions: Position[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 3) doorPositions.push({ row: r, col: c });
      }
    }

    // Haal alle vragen voor dit level op bij de LLM (één API-call)
    const globalShown = getGlobalShown();
    fetchQuestionsForLevel({
      currentWorld,
      level: currentLevel,
      count: doorPositions.length,
      excludeVragen: globalShown.vraagTexts,
    }).then((questions) => {
      if (cancelled) return;
      // Koppel elke deur aan een vraag; vul resterende deuren met fallback
      doorPositions.forEach((pos, i) => {
        const key = `${pos.row},${pos.col}`;
        const question =
          questions[i] ??
          getRandomQuestion(getGlobalShown().fingerprints);
        doorQuestions.current.set(key, question);
      });
      setLevelQuestionsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      // API onbereikbaar: fallback bank gebruiken
      const fp = getGlobalShown().fingerprints;
      doorPositions.forEach((pos) => {
        const key = `${pos.row},${pos.col}`;
        doorQuestions.current.set(key, getRandomQuestion(fp));
      });
      setLevelQuestionsLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel, currentWorld]);

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
        // Nu pas toevoegen aan globale shown: vraag is correct beantwoord
        if (currentQuestion) {
          addToGlobalShown(questionFingerprint(currentQuestion), currentQuestion.vraag);
        }
        // Deur vergeet de vraag: deur opent (type 0)
        const doorKey = `${terminalCell.row},${terminalCell.col}`;
        doorQuestions.current.delete(doorKey);
        setMap((prev) => {
          const next = prev.map((row) => [...row]);
          next[terminalCell.row][terminalCell.col] = 0;
          return next;
        });
        setTerminalCell(null);
        setCurrentQuestion(null);
      } else {
        // Fout: vraag NIET toevoegen aan shown – de deur behoudt dezelfde vraag
        setLastAnswerWasWrong(true);
        setFeedback(currentQuestion?.feedbackBijFout ?? "Fout! Denk aan de stam van het werkwoord.");
      }
    },
    [terminalCell, currentQuestion]
  );

  // Feedback sluit niet automatisch – de leerling klikt zelf het kruisje weg (zie QuizModal).

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
        const doorKey = `${newRow},${newCol}`;
        setTerminalCell({ row: newRow, col: newCol });
        // Vraag is al pre-geladen bij level-start; toon de gekoppelde vraag voor deze deur
        const question = doorQuestions.current.get(doorKey) ?? getRandomQuestion(getGlobalShown().fingerprints);
        setCurrentQuestion(question);
        setIsModalOpen(true);
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
  }, [player, map, isModalOpen, currentLevel, currentWorld, lastAnswerWasWrong, onLevelComplete, onWorldComplete]);

  if (levelQuestionsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 font-opendyslexic">
        <p className="text-2xl font-bold text-slate-700">Wereld {currentWorld}, Level {currentLevel}</p>
        <p className="text-xl text-slate-500">Vragen laden voor dit level…</p>
        <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full animate-pulse rounded-full bg-blue-500" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

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
        questionLoading={false}
        feedback={feedback}
        onAnswer={handleTerminalAnswer}
        onDismissFeedback={() => {
          setFeedback("");
          setIsModalOpen(false);
          setTerminalCell(null);
        }}
      />
    </div>
  );
}
