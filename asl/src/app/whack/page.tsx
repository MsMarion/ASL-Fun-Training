"use client";

import { useState, useEffect } from "react";
import { WhackAMoleCanvas } from "~/components/game/WhackAMoleCanvas";

export default function WhackPage() {
  const [gameState, setGameState] = useState("idle");
  const isIdle = gameState === "idle";

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("whack-game-state", { detail: !isIdle }));
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("whack-game-state", { detail: false }));
      }
    };
  }, [isIdle]);

  return <WhackAMoleCanvas onStateChange={setGameState} />;
}
