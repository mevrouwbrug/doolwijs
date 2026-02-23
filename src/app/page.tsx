"use client";

import { useState, useEffect, useCallback } from "react";
import { MainMenu } from "@/components/MainMenu";
import { GameMap } from "@/components/GameMap";

const STORAGE_KEY = "doolwijs-progress";

interface SavedProgress {
  unlockedWorlds: number;
  currentWorld: number;
  currentLevel: number;
}

function loadProgress(): SavedProgress {
  if (typeof window === "undefined") {
    return { unlockedWorlds: 1, currentWorld: 1, currentLevel: 1 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlockedWorlds: 1, currentWorld: 1, currentLevel: 1 };
    const data = JSON.parse(raw) as SavedProgress;
    return {
      unlockedWorlds: Math.max(1, Number(data.unlockedWorlds) || 1),
      currentWorld: Math.max(1, Number(data.currentWorld) || 1),
      currentLevel: Math.max(1, Math.min(5, Number(data.currentLevel) || 1)),
    };
  } catch {
    return { unlockedWorlds: 1, currentWorld: 1, currentLevel: 1 };
  }
}

function saveProgress(data: SavedProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function Home() {
  const [gameState, setGameState] = useState<"menu" | "playing">("menu");
  const [unlockedWorlds, setUnlockedWorlds] = useState(1);
  const [currentWorld, setCurrentWorld] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const progress = loadProgress();
    setUnlockedWorlds(progress.unlockedWorlds);
    setCurrentWorld(progress.currentWorld);
    setCurrentLevel(progress.currentLevel);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveProgress({ unlockedWorlds, currentWorld, currentLevel });
  }, [hydrated, unlockedWorlds, currentWorld, currentLevel]);

  const handleStartWorld = useCallback((world: number) => {
    setCurrentWorld(world);
    setCurrentLevel(1);
    setGameState("playing");
  }, []);

  const handleLevelComplete = useCallback(() => {
    setCurrentLevel((prev) => Math.min(5, prev + 1));
  }, []);

  const handleWorldComplete = useCallback(() => {
    setUnlockedWorlds(2);
    setGameState("menu");
  }, []);

  const handleGoHome = useCallback(() => {
    setGameState("menu");
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center font-opendyslexic text-slate-600">
        Laden...
      </div>
    );
  }

  return (
    <>
      {gameState === "menu" && (
        <MainMenu unlockedWorlds={unlockedWorlds} onStartWorld={handleStartWorld} />
      )}
      {gameState === "playing" && (
        <GameMap
          currentWorld={currentWorld}
          currentLevel={currentLevel}
          onLevelComplete={handleLevelComplete}
          onWorldComplete={handleWorldComplete}
          onGoHome={handleGoHome}
        />
      )}
    </>
  );
}
