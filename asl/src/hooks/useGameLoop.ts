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
/**
 * Main game loop hook that integrates webcam, sign detection, and game logic.
 * Supports both Audio-driven and Timer-driven (fallback) game loops.
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

  // Audio Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    gameStatus: "idle", // 'idle' | 'playing' | 'finished'
  });

  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0); // Fallback timer start (perf.now)
  const pausedTimeRef = useRef<number>(0);
  const wasPausedRef = useRef<boolean>(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedPredictionsRef = useRef<Set<number>>(new Set());

  // Initialize Audio
  useEffect(() => {
    if (beatmap.audioUrl) {
      // Create audio object
      const audio = new Audio(beatmap.audioUrl);
      audio.volume = 0.6; // Default volume
      
      // Attempt to play immediately (might be blocked by browser policy until interaction)
      // We rely on the game loop to manage play/pause state based on connection
      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    } else {
      audioRef.current = null;
    }
  }, [beatmap.audioUrl]);

  const resetLoop = useCallback(() => {
    startTimeRef.current = performance.now();
    pausedTimeRef.current = 0;
    wasPausedRef.current = false;
    processedPredictionsRef.current.clear();

    // Reset Audio
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn("Audio play failed (autoplay policy?):", e));
    }

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
      gameStatus: "idle",
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
    // Initialize fallback timer
    startTimeRef.current = performance.now();
    
    // Initial Audio Start
    if (audioRef.current && isConnected) {
       audioRef.current.play().catch(e => console.warn("Audio autoplay blocked:", e));
    }

    const tick = (now: number) => {
      // Pause game clock during disconnection
      if (!isConnected) {
        if (!wasPausedRef.current) {
          pausedTimeRef.current = now;
          wasPausedRef.current = true;
          // Pause Audio
          audioRef.current?.pause();
        }
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Resume from pause
      if (wasPausedRef.current) {
        const pauseDuration = now - pausedTimeRef.current;
        startTimeRef.current += pauseDuration; // Shift fallback start time
        wasPausedRef.current = false;
        
        // Resume Audio
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio resume failed:", e));
        }
      }

      // Determine Current Game Time
      let elapsed: number;
      let effectiveStartTimeSec: number;

      if (audioRef.current) {
        // Source of Truth: Audio Time
        elapsed = audioRef.current.currentTime;
        
        // Calculate effective start time (in Seconds) for syncing predictions
        // prediction.clientTimestamp (Sec) - effectiveStartTime (Sec) = relativeTime (Sec)
        // relativeTime should match elapsed.
        // Therefore: prediction.clientTimestamp - effectiveStart = elapsed
        // effectiveStart = prediction.clientTimestamp(NOW) - elapsed
        effectiveStartTimeSec = (now / 1000) - elapsed;
      } else {
        // Source of Truth: Performance Timer
        elapsed = (now - startTimeRef.current) / 1000;
        effectiveStartTimeSec = startTimeRef.current / 1000;
      }

      // Game Finished
      const isAudioFinished = audioRef.current?.ended ?? false;
      if (elapsed > beatmap.totalDuration || isAudioFinished) {
        setState(prev => ({ ...prev, gameStatus: "finished" }));
        if (audioRef.current) audioRef.current.pause();
        // Do not reset loop, let it sit in finished state
        cancelAnimationFrame(animFrameRef.current);
        return;
      }

      setState((prev) => {
        const activeIndex = prev.activeNoteIndex;

        // Check if all notes processed
        if (activeIndex >= beatmap.notes.length) {
          return { ...prev, currentTime: elapsed };
        }

        const activeNote = beatmap.notes[activeIndex]!;
        const earlyStart = activeNote.time - TRACKING_WINDOW;
        const deadline = activeNote.time + LATE_GRACE;

        // 1. Search for a VALID HIT in the history
        // Note: effectiveStartTimeSec MUST be in SECONDS
        const bestMatch = findBestPrediction(
          latestPredictionsRef.current,
          activeNote,
          earlyStart,
          deadline,
          effectiveStartTimeSec, 
          processedPredictionsRef.current
        );

        // 2. Also get the absolute latest unconsumed prediction for fallback feedback
        const latestUnconsumed = latestPredictionsRef.current
          .filter(p => !processedPredictionsRef.current.has(p.clientTimestamp))
          .at(-1) || null;

        // Evaluate note
        const judgement = evaluateNote(activeNote, bestMatch ?? latestUnconsumed, elapsed, prev.streak);

        // Debug: Get latest prediction
        const latestPred = latestPredictionsRef.current.length > 0
          ? latestPredictionsRef.current[latestPredictionsRef.current.length - 1] ?? null
          : null;

        if (judgement.type === "hit") {
          // HIT Logic
          if (latestUnconsumed) {
            processedPredictionsRef.current.add(latestUnconsumed.clientTimestamp);
          }

          const newStreak = prev.streak + 1;
          const newScore = prev.score + judgement.points;
          const newMultiplier = Math.min(Math.floor(newStreak / 3) + 1, 4);
          let feedbackText = "HIT!" + ` (${judgement.sawLetter})`;

          // Streak Milestone
          let streakMilestone: number | null = null;
          if (newStreak === 5 || newStreak === 10 || newStreak === 25) {
            streakMilestone = newStreak;
            setTimeout(() => setState((s) => ({ ...s, streakMilestone: null })), 1000);
          }

          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
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

          // Seamless transition to next note
          const nextIndex = activeIndex + 1;
          const nextNote = beatmap.notes[nextIndex];
          const trackingStartNext = nextNote ? nextNote.time - TRACKING_WINDOW : Infinity;
          const nextNoteVisible = nextNote && elapsed >= trackingStartNext;

          return {
            ...prev,
            currentTime: elapsed,
            currentNote: nextNoteVisible ? nextNote : null,
            noteState: "idle",
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
          // MISS Logic
          const newLives = Math.max(prev.lives - 1, 0);
          let missedFeedback = "MISS!";
          if (judgement.reason === "WRONG SIGN") missedFeedback = `MISS (Wrong: ${judgement.sawLetter})`;
          else if (judgement.reason === "LOW CONFIDENCE") missedFeedback = `MISS (Low Confidence)`;
          else if (judgement.reason === "TOO LATE") missedFeedback = `MISS (Too Late)`;

          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
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

        // PENDING Logic
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
      // Pause audio on unmount/effect cleanup
      if (audioRef.current) {
          audioRef.current.pause();
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
