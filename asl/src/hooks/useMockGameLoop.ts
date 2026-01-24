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
}

const INITIAL_LIVES = 5;
const FEEDBACK_DURATION_MS = 800;
const HIT_SCORE = 100;

export function useMockGameLoop(beatmap: Beatmap): GameState {
  const [state, setState] = useState<GameState>({
    currentTime: 0,
    score: 0,
    streak: 0,
    lives: INITIAL_LIVES,
    currentNote: null,
    noteState: "idle",
    feedbackText: null,
    notes: beatmap.notes,
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

          // 70% chance of success for demo
          const isHit = Math.random() < 0.7;

          setState((prev) => {
            const newStreak = isHit ? prev.streak + 1 : 0;
            const multiplier = Math.min(Math.floor(newStreak / 3) + 1, 4);
            const scoreGain = isHit ? HIT_SCORE * multiplier : 0;
            const newLives = isHit ? prev.lives : Math.max(prev.lives - 1, 0);

            let feedbackText: string | null = null;
            if (isHit) {
              feedbackText = newStreak >= 5 ? "PERFECT!" : "GREAT!";
            } else {
              feedbackText = "MISS!";
            }

            return {
              ...prev,
              currentNote: note,
              noteState: isHit ? "success" : "miss",
              score: prev.score + scoreGain,
              streak: newStreak,
              lives: newLives,
              feedbackText,
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

  return state;
}
