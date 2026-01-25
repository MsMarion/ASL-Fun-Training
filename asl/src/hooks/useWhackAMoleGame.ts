"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AVAILABLE_LETTERS } from "~/lib/svgLoader";

export type WhackAMoleGameState = "idle" | "starting" | "playing" | "cooldown" | "finished";

export interface GameMetrics {
  reactionTimes: number[];
  totalCorrect: number;
  totalMisses: number;
}

const FILTERED_LETTERS = AVAILABLE_LETTERS.filter(
  (letter) => letter !== "Z" && letter !== "J"
);

const GAME_DURATION = 30;
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

  // Helper to manage cooldowns (both initial and inter-round)
  const startCooldown = useCallback((seconds: number, state: "starting" | "cooldown" = "cooldown") => {
    setCountdown(seconds);
    setTargetLetter(null);
    setGameState(state);

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
  }, []); // Added dependency array for useCallback

  const nextTurn = useCallback(() => {
    const nextLetter = FILTERED_LETTERS[Math.floor(Math.random() * FILTERED_LETTERS.length)]!;
    setTargetLetter(nextLetter);
    setGameState("playing");
    roundStartTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setMetrics({ reactionTimes: [], totalCorrect: 0, totalMisses: 0 });
    setTimeLeft(GAME_DURATION);
    setGameState("starting"); // Initial state
    startCooldown(COOLDOWN_DURATION, "starting");
  }, [startCooldown]);

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

  // Game timer logic: Pause during "starting", run during "playing" or "cooldown"
  useEffect(() => {
    if ((gameState === "playing" || gameState === "cooldown") && timeLeft > 0) {
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
  }, [gameState, timeLeft]);

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
    
    // Inter-round cooldown
    startCooldown(ROUND_COOLDOWN, "cooldown");
  }, [gameState, targetLetter, startCooldown]);

  const handleMiss = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      totalMisses: prev.totalMisses + 1
    }));
  }, []);

  // Cleanup on unmount
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