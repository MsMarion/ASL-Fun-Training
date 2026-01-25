"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AVAILABLE_LETTERS, type AvailableLetter } from "~/lib/svgLoader";

export type WhackAMoleGameState = "idle" | "playing" | "cooldown" | "finished";

interface GameMetrics {
  reactionTimes: number[];
  totalCorrect: number;
}

const FILTERED_LETTERS = AVAILABLE_LETTERS.filter(
  (letter) => letter !== "Z" && letter !== "J"
);

export function useWhackAMoleGame() {
  const [gameState, setGameState] = useState<WhackAMoleGameState>("idle");
  const [targetLetter, setTargetLetter] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [metrics, setMetrics] = useState<GameMetrics>({ reactionTimes: [], totalCorrect: 0 });
  const [lastHit, setLastHit] = useState<{ points: number; timestamp: number } | null>(null);

  // Timers
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roundStartTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setScore(0);
    setMetrics({ reactionTimes: [], totalCorrect: 0 });
    setTimeLeft(60); // 60 seconds game
    setGameState("cooldown");
    startCooldown(3);
  }, []);

  const stopGame = useCallback(() => {
    setGameState("idle");
    setTargetLetter(null);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
  }, []);

  // Game Timer Effect
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Game Over
            setGameState("finished");
            setTargetLetter(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  const startCooldown = (infoSeconds: number) => {
    setCountdown(infoSeconds);
    setTargetLetter(null);
    setGameState("cooldown");

    let remaining = infoSeconds;
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        nextTurn();
      }
    }, 1000);
  };

  const nextTurn = () => {
    const randomIdx = Math.floor(Math.random() * FILTERED_LETTERS.length);
    const nextLetter = FILTERED_LETTERS[randomIdx]!;

    setTargetLetter(nextLetter);
    setGameState("playing");
    roundStartTimeRef.current = Date.now();
  };

  const handleInteraction = useCallback((letter: string) => {
    if (gameState !== "playing" || !targetLetter) return;

    if (letter === targetLetter) {
      // Correct!
      const now = Date.now();
      const reactionTime = now - roundStartTimeRef.current;

      // Score calculation (faster = more points, max 1000)
      // Base 500 + bonus for speed (under 2s)
      const speedBonus = Math.max(0, 2000 - reactionTime) / 4;
      const points = Math.floor(500 + speedBonus);

      setScore(prev => prev + points);
      setMetrics(prev => ({
        reactionTimes: [...prev.reactionTimes, reactionTime],
        totalCorrect: prev.totalCorrect + 1
      }));

      // Trigger visual feedback
      setLastHit({ points, timestamp: Date.now() });

      // Trigger Cooldown before next
      startCooldown(1); // Short 1s breath between letters
    }
  }, [gameState, targetLetter]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, []);

  return {
    gameState,
    targetLetter,
    score,
    countdown,
    metrics,
    lastHit,
    startGame,
    stopGame,
    handleInteraction,
    availableLetters: AVAILABLE_LETTERS,
    timeLeft
  };
}
