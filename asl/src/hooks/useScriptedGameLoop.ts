"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type BeatmapNote } from "~/lib/beatmap";

export interface GameState {
  currentTime: number;
  score: number;
  streak: number;
  lives: number;
  currentNote: BeatmapNote | null;
  noteState: "idle" | "success" | "miss";
  feedbackText: string | null;
  notes: BeatmapNote[];
  lastHitQuality: "PERFECT" | "GREAT" | "OK" | null;
  streakMilestone: number | null;
  comboMultiplier: number;
  handDetected: boolean;
  isConnected: boolean;
  activeNoteIndex: number;
  latestPrediction: { letter: string; confidence: number } | null;
  latency: number;
}

const INITIAL_LIVES = 5;
const FEEDBACK_DURATION_MS = 800;
const HIT_SCORE = 100;

// Scripted outcomes for the demo
// true = hit, false = miss
// transform string "P", "G", "O", "M" into outcomes
type ScriptStep = "PERFECT" | "GREAT" | "OK" | "MISS";

// A predefined script for the demo run
// Designed to showcase: Hits -> Miss -> Recovery -> Milestones -> Streak Fire
const DEMO_SCRIPT: ScriptStep[] = [
  "PERFECT", "PERFECT", "PERFECT", "PERFECT", // 0-3: Build initial streak
  "MISS",                                     // 4: Break streak, show damage
  "PERFECT", "PERFECT", "PERFECT", "PERFECT", "PERFECT", // 5-9: Rebuild to 5 (Milestone)
  "GREAT", "GREAT", "GREAT", "GREAT", "GREAT", // 10-14: Reach 10 (Milestone)
  "PERFECT", "PERFECT", "PERFECT", "PERFECT", "PERFECT", // 15-19
  "PERFECT", "PERFECT", "PERFECT", "PERFECT", "PERFECT", // 20-24: Reach 25 (Milestone)
  "OK", "OK", "OK",                           // 25-27: Show OK feedback
  "PERFECT", "PERFECT", "MISS", "PERFECT",    // 28+: Mixed
];

export function useScriptedGameLoop(beatmap: Beatmap): {
  state: GameState;
  restart: () => void;
} {
  const [state, setState] = useState<GameState>({
    currentTime: 0,
    score: 0,
    streak: 0,
    lives: INITIAL_LIVES,
    currentNote: null,
    noteState: "idle",
    feedbackText: null,
    notes: beatmap.notes,
    lastHitQuality: null,
    streakMilestone: null,
    comboMultiplier: 1,
    handDetected: true,
    isConnected: true,
    activeNoteIndex: 0,
    latestPrediction: null,
    latency: 0,
  });

  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const processedIndexRef = useRef<number>(-1);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetLoop = useCallback(() => {
    processedIndexRef.current = -1;
    startTimeRef.current = performance.now();
    setState((prev) => ({
      ...prev,
      currentTime: 0,
      score: 0,
      streak: 0,
      lives: INITIAL_LIVES,
      currentNote: null,
      noteState: "idle",
      feedbackText: null,
      lastHitQuality: null,
      streakMilestone: null,
      comboMultiplier: 1,
      activeNoteIndex: 0,
      latestPrediction: null,
      latency: 0,
    }));
  }, []);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;

      // Restart loop when beatmap ends
      if (elapsed > beatmap.totalDuration) {
        resetLoop();
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Check if we've reached the next note
      const nextIndex = processedIndexRef.current + 1;
      if (nextIndex < beatmap.notes.length) {
        const note = beatmap.notes[nextIndex]!;
        if (elapsed >= note.time) {
          processedIndexRef.current = nextIndex;

          // DETERMINISTIC LOGIC HERE
          // Loop the script if we run out of steps
          const scriptStep = DEMO_SCRIPT[nextIndex % DEMO_SCRIPT.length] || "PERFECT";
          const isHit = scriptStep !== "MISS";

          setState((prev) => {
            const newStreak = isHit ? prev.streak + 1 : 0;
            const multiplier = Math.min(Math.floor(newStreak / 3) + 1, 4);
            const scoreGain = isHit ? HIT_SCORE * multiplier : 0;
            const newLives = isHit ? prev.lives : Math.max(prev.lives - 1, 0);

            let feedbackText: string | null = null;
            let hitQuality: "PERFECT" | "GREAT" | "OK" | null = null;

            if (isHit) {
              hitQuality = scriptStep as "PERFECT" | "GREAT" | "OK";
              feedbackText = hitQuality + "!";
            } else {
              feedbackText = "MISS!";
            }

            // Check for streak milestones
            let streakMilestone: number | null = null;
            if (isHit && (newStreak === 5 || newStreak === 10 || newStreak === 25)) {
              streakMilestone = newStreak;
              // Clear milestone after 1s
              setTimeout(() => {
                setState((s) => ({ ...s, streakMilestone: null }));
              }, 1000);
            }

            return {
              ...prev,
              currentNote: note,
              noteState: isHit ? "success" : "miss",
              score: prev.score + scoreGain,
              streak: newStreak,
              lives: newLives,
              feedbackText,
              lastHitQuality: hitQuality,
              streakMilestone,
              comboMultiplier: multiplier,
              activeNoteIndex: nextIndex + 1,
            };
          });

          // Clear feedback after duration
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              noteState: "idle",
              feedbackText: null,
            }));
          }, FEEDBACK_DURATION_MS);
        }
      }

      setState((prev) => ({ ...prev, currentTime: elapsed }));
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [beatmap, resetLoop]);

  return { state, restart: resetLoop };
}
