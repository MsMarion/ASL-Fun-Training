/**
 * Pure scoring logic for ASL Fun Training game.
 * Implements "early OK, late penalized" timing mechanic.
 */

import { type BeatmapNote, NOTE_WINDOW_DURATION, NOTE_LATE_GRACE, NOTE_TRACKING_WINDOW } from "./beatmap";

// Timing windows (in seconds) - imported from beatmap.ts for sync
export const EARLY_WINDOW = NOTE_WINDOW_DURATION; // Notes become hittable when visible
export const LATE_GRACE = NOTE_LATE_GRACE; // Deadline after target time
export const TRACKING_WINDOW = NOTE_TRACKING_WINDOW; // When to start tracking for hits
export const PERFECT_THRESHOLD = 1.0; // ±1.0s for PERFECT (very generous)
export const CONFIDENCE_THRESHOLD = 0.50; // Minimum confidence (lowered further)
export const VISUAL_TRIGGER_WINDOW = NOTE_WINDOW_DURATION; // Hits register when notes appear
export const INPUT_OFFSET = 0.15; // Global offset to compensate for system latency (seconds)

// Scoring constants
export const HIT_POINTS = 100;
export const STREAK_DIVISOR = 3; // Multiplier increases every 3 hits
export const MAX_MULTIPLIER = 4;

export type HitQuality = "HIT";

export interface SignPrediction {
  letter: string;
  confidence: number;
  clientTimestamp: number;
  handDetected: boolean;
}

export type JudgementResult =
  | { type: "hit"; quality: HitQuality; points: number; sawLetter: string }
  | { type: "miss"; reason: "TOO LATE" | "WRONG SIGN" | "LOW CONFIDENCE" | "NONE"; sawLetter: string }
  | { type: "pending" };

/**
 * Calculate the streak multiplier based on current streak count.
 */
export function calculateMultiplier(streak: number): number {
  return Math.min(Math.floor(streak / STREAK_DIVISOR) + 1, MAX_MULTIPLIER);
}

/**
 * Evaluate a single note against a prediction.
 * Returns HIT as soon as valid prediction is found in the tracking window.
 */
export function evaluateNote(
  note: BeatmapNote,
  prediction: SignPrediction | null,
  currentTime: number,
  streak: number,
): JudgementResult {
  const timeUntilTarget = note.time - currentTime;
  
  // Note hasn't entered tracking window yet (still approaching)
  if (timeUntilTarget > TRACKING_WINDOW) {
    return { type: "pending" };
  }
  
  // Note has exited LATE zone - this is the MISS trigger point (SVG disappears here)
  if (timeUntilTarget < -LATE_GRACE) {
    if (prediction) {
      if (prediction.letter.toUpperCase() !== note.letter.toUpperCase()) {
        return { type: "miss", reason: "WRONG SIGN", sawLetter: prediction.letter };
      }
      if (prediction.confidence < CONFIDENCE_THRESHOLD) {
        return { type: "miss", reason: "LOW CONFIDENCE", sawLetter: prediction.letter };
      }
    }
    return { type: "miss", reason: "TOO LATE", sawLetter: prediction?.letter ?? "None" };
  }
  
  // In tracking window - check for valid HIT
  if (prediction && 
      prediction.letter.toUpperCase() === note.letter.toUpperCase() &&
      prediction.confidence >= CONFIDENCE_THRESHOLD &&
      prediction.handDetected) {
    
    // Valid HIT - simple binary state
    const multiplier = calculateMultiplier(streak);
    
    return {
      type: "hit",
      quality: "HIT",
      points: HIT_POINTS * multiplier,
      sawLetter: prediction.letter,
    };
  }
  
  // Still in tracking window, no valid hit yet - keep waiting
  return { type: "pending" };
}

/**
 * Find the best matching prediction from a list of recent predictions.
 * Returns the prediction with highest confidence that matches the note letter
 * and falls within the valid time window.
 *
 * @param predictions Array of recent predictions
 * @param note The note to match against
 * @param earlyStart Earliest valid timestamp
 * @param deadline Latest valid timestamp
 * @returns Best matching prediction or null
 */
export function findBestPrediction(
  predictions: SignPrediction[],
  note: BeatmapNote,
  earlyStart: number,
  deadline: number,
  gameStartTime: number,
  ignoredTimestamps: Set<number>,
): SignPrediction | null {
  // Debug logging
  /*
  console.log(`Checking note ${note.letter} at ${note.time}`);
  console.log(`Window: ${earlyStart} -> ${deadline}`);
  console.log(`Predictions: ${predictions.length}`);
  */

  const validPredictions = predictions.filter(
    (p) => {
      // Ignore consumed predictions
      if (ignoredTimestamps.has(p.clientTimestamp)) {
        return false;
      }

      const matchLetter = p.letter.toUpperCase() === note.letter.toUpperCase();
      const matchConf = p.confidence >= CONFIDENCE_THRESHOLD;
      const matchHand = p.handDetected;

      // Apply Input Offset
      const relativeTime = (p.clientTimestamp - gameStartTime) - INPUT_OFFSET;
      const matchTime = relativeTime >= earlyStart && relativeTime <= deadline;

      return matchLetter && matchConf && matchHand && matchTime;
    }
  );

  if (validPredictions.length === 0) {
    return null;
  }

  // Return the LATEST valid prediction (most recent)
  // This ensures we use the "current" state of the hand, closest to the target
  return validPredictions[validPredictions.length - 1] ?? null;
}
