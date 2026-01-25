"use client";

import { useState, useRef, useEffect } from "react";
import { type SignPrediction } from "~/lib/gameScoring";

const HOLD_DURATION = 1500;

interface AIInteractionProps {
  predictions: SignPrediction[];
  targetLetter: string | null;
  isPlaying: boolean;
  isConnected: boolean;
  onCorrect: (letter: string) => void;
  onMistake: (showed: string, expected: string) => void;
}

/**
 * Manages AI sign detection interactions.
 * Handles hold-to-confirm logic and mistake detection.
 */
export function useAIInteraction({
  predictions,
  targetLetter,
  isPlaying,
  isConnected,
  onCorrect,
  onMistake,
}: AIInteractionProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const lastMistakeRef = useRef<string>("");

  const latestPrediction = predictions[predictions.length - 1] ?? null;

  useEffect(() => {
    if (!isPlaying || !targetLetter || !isConnected) {
      holdStartRef.current = null;
      setHoldProgress(0);
      return;
    }

    const isCorrect = latestPrediction &&
      latestPrediction.letter === targetLetter &&
      latestPrediction.confidence >= 0.5;

    if (isCorrect) {
      // Start or continue hold
      if (!holdStartRef.current) {
        holdStartRef.current = Date.now();
      } else {
        const elapsed = Date.now() - holdStartRef.current;
        const progress = Math.min(elapsed / HOLD_DURATION, 1);
        setHoldProgress(progress);

        if (elapsed >= HOLD_DURATION) {
          onCorrect(targetLetter);
          holdStartRef.current = null;
          setHoldProgress(0);
        }
      }
    } else {
      // Wrong sign or low confidence
      if (latestPrediction && 
          latestPrediction.letter !== targetLetter && 
          latestPrediction.confidence >= 0.5) {
        
        const mistakeKey = `${latestPrediction.letter}->${targetLetter}`;
        
        // Debounce: only fire once per unique mistake
        if (mistakeKey !== lastMistakeRef.current) {
          lastMistakeRef.current = mistakeKey;
          onMistake(latestPrediction.letter, targetLetter);
        }
      }

      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [isPlaying, targetLetter, latestPrediction, isConnected, onCorrect, onMistake]);

  // Reset on target change
  useEffect(() => {
    lastMistakeRef.current = "";
    holdStartRef.current = null;
    setHoldProgress(0);
  }, [targetLetter]);

  return {
    holdProgress,
    latestPrediction,
  };
}