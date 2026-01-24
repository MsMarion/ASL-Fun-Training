"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type BeatmapNote } from "~/lib/beatmap";
import {
  evaluateNote,
  findBestPrediction,
  EARLY_WINDOW,
  LATE_GRACE,
} from "~/lib/gameScoring";
import { useWebcam } from "./useWebcam";
import { useSignDetection } from "./useSignDetection";

export interface GameState {
  currentTime: number;
  score: number;
  streak: number;
  lives: number;
  currentNote: BeatmapNote | null;
  noteState: "idle" | "success" | "miss";
  feedbackText: string | null;
  notes: BeatmapNote[];
  handDetected: boolean;
  isConnected: boolean;
  activeNoteIndex: number;
}

const INITIAL_LIVES = 5;
const FEEDBACK_DURATION_MS = 800;

/**
 * Main game loop hook that integrates webcam, sign detection, and game logic.
 * Replaces useMockGameLoop with real CV integration.
 */
export function useGameLoop(beatmap: Beatmap): {
  state: GameState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  webcamReady: boolean;
  webcamError: string | null;
} {
  // Webcam setup
  const { videoRef, canvasRef, isReady: webcamReady, error: webcamError, captureFrame } = useWebcam();

  // Sign detection via WebSocket
  const {
    predictions,
    isConnected,
    handDetected,
  } = useSignDetection(captureFrame, webcamReady, true);

  // Game state
  const [state, setState] = useState<GameState>({
    currentTime: 0,
    score: 0,
    streak: 0,
    lives: INITIAL_LIVES,
    currentNote: null,
    noteState: "idle",
    feedbackText: null,
    notes: beatmap.notes,
    handDetected: false,
    isConnected: false,
    activeNoteIndex: 0,
  });

  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedPredictionsRef = useRef<Set<number>>(new Set());

  const resetLoop = useCallback(() => {
    startTimeRef.current = performance.now();
    pausedTimeRef.current = 0;
    wasPausedRef.current = false;
    processedPredictionsRef.current.clear();

    setState((prev) => ({
      ...prev,
      currentTime: 0,
      score: 0,
      streak: 0,
      lives: INITIAL_LIVES,
      currentNote: null,
      noteState: "idle",
      feedbackText: null,
      activeNoteIndex: 0,
    }));
  }, []);

  // Update connection/hand status from sign detection
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      handDetected,
      isConnected,
    }));
  }, [handDetected, isConnected]);

  // Main game loop
  useEffect(() => {
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      // Pause game clock during disconnection
      if (!isConnected) {
        if (!wasPausedRef.current) {
          pausedTimeRef.current = now;
          wasPausedRef.current = true;
        }
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Resume from pause
      if (wasPausedRef.current) {
        const pauseDuration = now - pausedTimeRef.current;
        startTimeRef.current += pauseDuration;
        wasPausedRef.current = false;
      }

      const elapsed = (now - startTimeRef.current) / 1000;

      // Restart loop when beatmap ends
      if (elapsed > beatmap.totalDuration) {
        resetLoop();
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      setState((prev) => {
        const activeIndex = prev.activeNoteIndex;

        // Check if all notes processed
        if (activeIndex >= beatmap.notes.length) {
          return { ...prev, currentTime: elapsed };
        }

        const activeNote = beatmap.notes[activeIndex]!;
        const earlyStart = activeNote.time - EARLY_WINDOW;
        const deadline = activeNote.time + LATE_GRACE;

        // Find best matching prediction for the active note
        const bestPrediction = findBestPrediction(
          predictions,
          activeNote,
          earlyStart,
          deadline,
        );

        // Evaluate note
        const judgement = evaluateNote(activeNote, bestPrediction, elapsed, prev.streak);

        if (judgement.type === "hit") {
          // Success!
          const newStreak = prev.streak + 1;
          const newScore = prev.score + judgement.points;

          let feedbackText: string;
          if (judgement.quality === "PERFECT") {
            feedbackText = "PERFECT!";
          } else if (judgement.quality === "GREAT") {
            feedbackText = "GREAT!";
          } else {
            feedbackText = "OK!";
          }

          // Clear previous feedback timeout
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
          }

          // Set feedback timeout
          feedbackTimeoutRef.current = setTimeout(() => {
            setState((s) => ({
              ...s,
              noteState: "idle",
              feedbackText: null,
            }));
          }, FEEDBACK_DURATION_MS);

          return {
            ...prev,
            currentTime: elapsed,
            currentNote: activeNote,
            noteState: "success",
            feedbackText,
            score: newScore,
            streak: newStreak,
            activeNoteIndex: activeIndex + 1,
          };
        } else if (judgement.type === "miss") {
          // Missed deadline
          const newLives = Math.max(prev.lives - 1, 0);

          // Clear previous feedback timeout
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
          }

          // Set feedback timeout
          feedbackTimeoutRef.current = setTimeout(() => {
            setState((s) => ({
              ...s,
              noteState: "idle",
              feedbackText: null,
            }));
          }, FEEDBACK_DURATION_MS);

          return {
            ...prev,
            currentTime: elapsed,
            currentNote: activeNote,
            noteState: "miss",
            feedbackText: "MISS!",
            lives: newLives,
            streak: 0,
            activeNoteIndex: activeIndex + 1,
          };
        }

        // Still pending
        return {
          ...prev,
          currentTime: elapsed,
          currentNote: elapsed >= earlyStart ? activeNote : null,
        };
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [beatmap, isConnected, predictions, resetLoop]);

  return {
    state,
    videoRef,
    canvasRef,
    webcamReady,
    webcamError,
  };
}
