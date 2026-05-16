"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap } from "~/lib/beatmap"; // Assuming this type exists and is exported
import { useWebcam } from "./useWebcam";
import { useSignDetection } from "./useSignDetection";

export type TrainingGameState = "idle" | "playing" | "finished";

export interface TrainingNoteMetric {
  letter: string;
  timeSpent: number; // in ms
  status: "success" | "skipped";
}

interface TrainingGameMetrics {
  totalTime: number; // in ms
  noteMetrics: TrainingNoteMetric[];
}

export function useTrainingGame(beatmap: Beatmap | null, isInstantMode: boolean = false) {
  const [gameState, setGameState] = useState<TrainingGameState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState<TrainingGameMetrics>({ totalTime: 0, noteMetrics: [] });

  // Timers and Refs
  const currentNoteStartTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);

  const { videoRef, canvasRef, isReady, error, captureFrame } = useWebcam();

  const { predictions, isConnected, handDetected, latency } = useSignDetection(
    videoRef,
    isReady,
    true
  );

  const latestPrediction = predictions[predictions.length - 1] ?? null;

  const currentNote = beatmap?.notes[currentIndex] ?? null;
  const isLastNote = beatmap ? currentIndex >= beatmap.notes.length : true;

  // Start Game
  const startGame = useCallback(() => {
    if (!beatmap) return;
    setGameState("playing");
    setCurrentIndex(0);
    setMetrics({ totalTime: 0, noteMetrics: [] });
    gameStartTimeRef.current = Date.now();
    currentNoteStartTimeRef.current = Date.now();
  }, [beatmap]);

  // Restart Game
  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // Hold Logic
  const HOLD_DURATION = 250; // 0.25 seconds
  const accumulatedHoldTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const [holdProgress, setHoldProgress] = useState(0);

  // Reset accumulator when note changes
  useEffect(() => {
    accumulatedHoldTimeRef.current = 0;
    setHoldProgress(0);
    lastFrameTimeRef.current = Date.now();
  }, [currentIndex, gameState]);

  // Main Logic Loop - runs on interval for continuous skip checking
  useEffect(() => {
    if (gameState !== "playing" || !currentNote) {
      return;
    }

    const checkLogic = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Safety check for huge deltas (e.g. tab switch)
      if (delta > 500) return;

      const timeSpent = now - currentNoteStartTimeRef.current;
      const TIME_LIMIT = 10000; // 10 seconds

      // Check for correct interaction
      const pred = latestPrediction;
      const isCorrect = pred &&
        pred.letter.toLowerCase() === currentNote.letter.toLowerCase() &&
        pred.confidence >= 0.5;

      // 1. Check for Skip (Time Limit)
      if (timeSpent >= TIME_LIMIT && accumulatedHoldTimeRef.current < 500) {
        recordMetric("skipped");
        advanceNote();
        return;
      }

      // 2. Interaction Logic
      if (isInstantMode) {
        // INSTANT MODE: No hold required
        // Enforce 0.5s delay before accepting detection to prevent double-hits
        if (timeSpent < 500) return;

        if (isCorrect) {
          recordMetric("success");
          advanceNote();
        }
      } else {
        // HOLD MODE: Accumulator Logic
        if (isCorrect) {
          accumulatedHoldTimeRef.current += delta;
        }

        // Clamp
        accumulatedHoldTimeRef.current = Math.max(0, Math.min(accumulatedHoldTimeRef.current, HOLD_DURATION));

        // Check Success
        if (accumulatedHoldTimeRef.current >= HOLD_DURATION) {
          recordMetric("success");
          advanceNote();
        }
      }

      // Update State (for UI)
      setHoldProgress(accumulatedHoldTimeRef.current / HOLD_DURATION);
    };

    // Run immediately once
    checkLogic();

    // Then run on interval
    const intervalId = setInterval(checkLogic, 100);
    return () => clearInterval(intervalId);
  }, [gameState, currentNote, latestPrediction, currentIndex, isInstantMode]);

  const recordMetric = (status: "success" | "skipped") => {
    if (!currentNote) return;
    const now = Date.now();
    const timeSpent = now - currentNoteStartTimeRef.current;

    setMetrics(prev => ({
      ...prev,
      noteMetrics: [
        ...prev.noteMetrics,
        { letter: currentNote.letter, timeSpent, status }
      ]
    }));
  };

  const advanceNote = () => {
    if (!beatmap) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex >= beatmap.notes.length) {
      // Finished
      const totalTime = Date.now() - gameStartTimeRef.current;
      setMetrics(prev => ({ ...prev, totalTime }));
      setGameState("finished");
      setCurrentIndex(nextIndex); // To clear currentNote
    } else {
      setCurrentIndex(nextIndex);
      currentNoteStartTimeRef.current = Date.now();
    }
  };

  return {
    gameState,
    currentNote,
    currentIndex,
    totalNotes: beatmap?.notes.length ?? 0,
    metrics,
    holdProgress,
    startGame,
    restartGame,
    videoRef,
    canvasRef,
    isReady,
    error,
    isConnected,
    handDetected,
    latestPrediction,
    latency,
    timeOnCurrentNote: gameState === "playing" ? Date.now() - currentNoteStartTimeRef.current : 0
  };
}
