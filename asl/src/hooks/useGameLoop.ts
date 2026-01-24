"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type BeatmapNote } from "~/lib/beatmap";
import {
  evaluateNote,
  findBestPrediction,
  EARLY_WINDOW,
  LATE_GRACE,
  TRACKING_WINDOW,
} from "~/lib/gameScoring";
import { useWebcam } from "./useWebcam";
import { useSignDetection } from "./useSignDetection";
import { type GameState, type DebugLogEntry, type HitQuality } from "~/types/game";


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
    latency,
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
    feedbackLetter: null,
    notes: beatmap.notes,
    handDetected: false,
    isConnected: false,
    activeNoteIndex: 0,
    lastHitQuality: null,
    streakMilestone: null,
    comboMultiplier: 1,
    latestPrediction: null,
    latency: 0,
    debugLog: [],
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
      lastHitQuality: null,
      streakMilestone: null,
      comboMultiplier: 1,
      latestPrediction: null,
      latency: 0,
    }));
  }, []);

  // Update connection/hand status from sign detection
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      handDetected,
      isConnected,
      latency,
    }));
  }, [handDetected, isConnected, latency]);

  // Sync predictions to ref for game loop use without triggering re-renders/resets
  const latestPredictionsRef = useRef(predictions);
  useEffect(() => {
    latestPredictionsRef.current = predictions;
  }, [predictions]);

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

        const gameStartTimeSec = startTimeRef.current / 1000;

        // Find the LATEST unconsumed prediction (regardless of letter)
        // This allows evaluateNote to see what was being signed even if it's wrong
        const latestUnconsumed = latestPredictionsRef.current
          .filter(p => !processedPredictionsRef.current.has(p.clientTimestamp))
          .at(-1) || null;

        // DEBUG: Log prediction timing
        if (latestUnconsumed) {
          console.log(`[DEBUG] Note ${activeNote.letter} @ t=${activeNote.time.toFixed(2)}, Current: ${elapsed.toFixed(2)}, PredTS: ${latestUnconsumed.clientTimestamp.toFixed(3)}, Letter: ${latestUnconsumed.letter}, Conf: ${(latestUnconsumed.confidence * 100).toFixed(0)}%`);
        } else {
          console.log(`[DEBUG] Note ${activeNote.letter} @ t=${activeNote.time.toFixed(2)}, Current: ${elapsed.toFixed(2)} - NO PREDICTIONS`);
        }

        // Evaluate note
        const judgement = evaluateNote(activeNote, latestUnconsumed, elapsed, prev.streak);

        // Debug: Get latest prediction
        const latestPred = latestPredictionsRef.current.length > 0
          ? latestPredictionsRef.current[latestPredictionsRef.current.length - 1] ?? null
          : null;

        // Helper to update state with debug info
        const withDebug = (s: any) => ({ ...s, latestPrediction: latestPred });

        if (judgement.type === "hit") {
          // Consume the prediction so it can't be used for the next note
          if (latestUnconsumed) {
            processedPredictionsRef.current.add(latestUnconsumed.clientTimestamp);
          }

          // Success!
          const newStreak = prev.streak + 1;
          const newScore = prev.score + judgement.points;
          const newMultiplier = Math.min(Math.floor(newStreak / 3) + 1, 4);


          let feedbackText: string = "HIT!" + ` (${judgement.sawLetter})`;
          // Removed Perfect/Great/OK distinction


          // Check for streak milestones
          let streakMilestone: number | null = null;
          if (newStreak === 5 || newStreak === 10 || newStreak === 25) {
            streakMilestone = newStreak;
            // Clear milestone after 1s
            setTimeout(() => {
              setState((s) => ({ ...s, streakMilestone: null }));
            }, 1000);
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
              feedbackLetter: null,
            }));
          }, FEEDBACK_DURATION_MS);

          const hitLogEntry: DebugLogEntry = {
            timestamp: Date.now(),
            type: "HIT",
            letter: activeNote.letter,
            delta: activeNote.time - elapsed,
            quality: "HIT",
            confidence: latestUnconsumed?.confidence,
          };

          // Calculate NEXT note immediately for seamless tracking
          const nextIndex = activeIndex + 1;
          const nextNote = beatmap.notes[nextIndex];
          const trackingStartNext = nextNote ? nextNote.time - TRACKING_WINDOW : Infinity;
          const nextNoteVisible = nextNote && elapsed >= trackingStartNext;

          return {
            ...prev,
            currentTime: elapsed,
            currentNote: nextNoteVisible ? nextNote : null, // Switch to next note immediately if visible
            noteState: "idle", // Reset to idle for the new note
            feedbackText,
            feedbackLetter: activeNote.letter,
            score: newScore,
            streak: newStreak,
            activeNoteIndex: nextIndex,
            lastHitQuality: "HIT",
            streakMilestone,
            comboMultiplier: newMultiplier,
            latestPrediction: latestPred,
            debugLog: [...prev.debugLog.slice(-20), hitLogEntry],
          };
        } else if (judgement.type === "miss") {
          // Missed deadline
          const newLives = Math.max(prev.lives - 1, 0);

          let missedFeedback = "MISS!";
          if (judgement.reason === "WRONG SIGN") {
            missedFeedback = `MISS (Wrong Letter: ${judgement.sawLetter})`;
          } else if (judgement.reason === "LOW CONFIDENCE") {
            missedFeedback = `MISS (Low Confidence: ${judgement.sawLetter})`;
          } else if (judgement.reason === "TOO LATE") {
            missedFeedback = `MISS (Too Late: ${judgement.sawLetter})`;
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
              feedbackLetter: null,
            }));
          }, FEEDBACK_DURATION_MS);

          const missLogEntry: DebugLogEntry = {
            timestamp: Date.now(),
            type: "MISS",
            letter: activeNote.letter,
            delta: activeNote.time - elapsed,
            confidence: latestUnconsumed?.confidence,
          };

          // Calculate NEXT note immediately
          const nextIndex = activeIndex + 1;
          const nextNote = beatmap.notes[nextIndex];
          const trackingStartNext = nextNote ? nextNote.time - TRACKING_WINDOW : Infinity;
          const nextNoteVisible = nextNote && elapsed >= trackingStartNext;

          return {
            ...prev,
            currentTime: elapsed,
            currentNote: nextNoteVisible ? nextNote : null,
            noteState: "idle",
            feedbackText: missedFeedback,
            feedbackLetter: activeNote.letter,
            lives: newLives,
            streak: 0,
            activeNoteIndex: nextIndex,
            lastHitQuality: null,
            comboMultiplier: 1,
            latestPrediction: latestPred,
            debugLog: [...prev.debugLog.slice(-20), missLogEntry],
          };
        }

        // Still pending
        // Only show currentNote in target window when we are within the TRACKING window (Green Zone)
        const trackingStart = activeNote.time - TRACKING_WINDOW;
        
        return {
          ...prev,
          currentTime: elapsed,
          currentNote: elapsed >= trackingStart ? activeNote : null,
          latestPrediction: latestPred,
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
  }, [beatmap, isConnected, resetLoop]); // Removed predictions from deps

  return {
    state,
    videoRef,
    canvasRef,
    webcamReady,
    webcamError,
  };
}
