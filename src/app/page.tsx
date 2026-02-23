"use client";

import { useState } from "react";
import { MainMenu } from "@/components/MainMenu";
import { GameMap } from "@/components/GameMap";

export default function Home() {
  const [gameState, setGameState] = useState<"menu" | "playing">("menu");
  const [unlockedWorlds, setUnlockedWorlds] = useState(1);
  const [currentWorld, setCurrentWorld] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);

  function handleStartWorld(world: number) {
    setCurrentWorld(world);
    setCurrentLevel(1);
    setGameState("playing");
  }

  function handleLevelComplete() {
    setCurrentLevel((prev) => prev + 1);
  }

  function handleWorldComplete() {
    setUnlockedWorlds(2);
    setGameState("menu");
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
        />
      )}
    </>
  );
}
