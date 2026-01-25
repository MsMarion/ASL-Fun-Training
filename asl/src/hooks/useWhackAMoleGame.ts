"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AVAILABLE_LETTERS } from "~/lib/svgLoader";

export type WhackAMoleGameState = "idle" | "playing" | "cooldown" | "finished";

export interface GameMetrics {
  reactionTimes: number[];
  totalCorrect: number;
  totalMisses: number;
}

const FILTERED_LETTERS = AVAILABLE_LETTERS.filter(
  (letter) => letter !== "Z" && letter !== "J"
);

const GAME_DURATION = 60;
const COOLDOWN_DURATION = 3;
const ROUND_COOLDOWN = 1;

/**
 * Core game loop logic - simplified and optimized.
 * No player management, just game state.
 */
export function useWhackAMoleGame() {
  const [gameState, setGameState] = useState<WhackAMoleGameState>("idle");
  const [targetLetter, setTargetLetter] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [metrics, setMetrics] = useState<GameMetrics>({ 
    reactionTimes: [], 
    totalCorrect: 0, 
    totalMisses: 0 
  });
  
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roundStartTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setScore(0);
    setMetrics({ reactionTimes: [], totalCorrect: 0, totalMisses: 0 });
    setTimeLeft(GAME_DURATION);
    setGameState("cooldown");
    startCooldown(COOLDOWN_DURATION);
  }, []);

  const resetGame = useCallback(() => {
    setGameState("idle");
    setTargetLetter(null);
    setScore(0);
    setMetrics({ reactionTimes: [], totalCorrect: 0, totalMisses: 0 });
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
  }, []);

  // Game timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState("finished");
            setTargetLetter(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (gameTimerRef.current) {
          clearInterval(gameTimerRef.current);
          gameTimerRef.current = null;
        }
      };
    }
  }, [gameState]);

  const startCooldown = (seconds: number) => {
    setCountdown(seconds);
    setTargetLetter(null);
    setGameState("cooldown");

    let remaining = seconds;
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        nextTurn();
      }
    }, 1000);
  };

  const nextTurn = () => {
    const nextLetter = FILTERED_LETTERS[Math.floor(Math.random() * FILTERED_LETTERS.length)]!;
    setTargetLetter(nextLetter);
    setGameState("playing");
    roundStartTimeRef.current = Date.now();
  };

  const handleCorrectHit = useCallback((letter: string) => {
    if (gameState !== "playing" || letter !== targetLetter) return;

    const reactionTime = Date.now() - roundStartTimeRef.current;
    const speedBonus = Math.max(0, 2000 - reactionTime) / 4; 
    const points = Math.floor(500 + speedBonus);

    setScore(prev => prev + points);
    setMetrics(prev => ({
      reactionTimes: [...prev.reactionTimes, reactionTime],
      totalCorrect: prev.totalCorrect + 1,
      totalMisses: prev.totalMisses
    }));
    
    startCooldown(ROUND_COOLDOWN);
  }, [gameState, targetLetter]);

  const handleMiss = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      totalMisses: prev.totalMisses + 1
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

  return {
    gameState,
    targetLetter,
    score,
    countdown,
    metrics,
    timeLeft,
    availableLetters: AVAILABLE_LETTERS,
    startGame,
    resetGame,
    handleCorrectHit,
    handleMiss,
  };
}