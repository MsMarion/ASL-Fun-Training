/**
 * Pure scoring logic for ASL Fun Training game.
 * Implements "early OK, late penalized" timing mechanic.
 */

import { type BeatmapNote } from "./beatmap";

// Timing windows (in seconds)
export const EARLY_WINDOW = 5.0; // Notes become hittable 5s before target time
export const LATE_GRACE = 1.5; // Deadline after target time (very forgiving)
export const PERFECT_THRESHOLD = 1.0; // ±1.0s for PERFECT (very generous)
export const CONFIDENCE_THRESHOLD = 0.50; // Minimum confidence (lowered further)
export const VISUAL_TRIGGER_WINDOW = 2.0; // Allow hits 2.0s before note reaches target (generous early window)
export const INPUT_OFFSET = 0.15; // Global offset to compensate for system latency (seconds)

// Scoring constants
export const PERFECT_POINTS = 100;
export const GREAT_POINTS = 100;
export const OK_POINTS = 60;
export const STREAK_DIVISOR = 3; // Multiplier increases every 3 hits
export const MAX_MULTIPLIER = 4;

export type HitQuality = "PERFECT" | "GREAT" | "OK";

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
 *
 * Timeline:
 *   [note.time - 2.0] ──GREAT──► [note.time - 0.3] ──PERFECT──► [note.time] ──PERFECT──► [note.time + 0.3] ──OK──► [note.time + 0.8]
 *        │                              │                           │                           │                      │
 *    Early start                    Perfect zone              Target time                  Perfect zone           Deadline
 *
 * @param note The beatmap note to evaluate
 * @param prediction The sign prediction from CV model (or null)
 * @param currentTime Current game time
 * @param streak Current streak count (for multiplier calculation)
 * @returns Judgement result (hit/miss/pending)
 */
export function evaluateNote(
  note: BeatmapNote,
  prediction: SignPrediction | null,
  currentTime: number,
  streak: number,
  gameStartTime: number,
): JudgementResult {
  const earlyStart = note.time - EARLY_WINDOW;
  const deadline = note.time + LATE_GRACE;

  // Check if we've passed the deadline
  if (currentTime > deadline) {
    // If we have a prediction but it was rejected, we can provide a reason
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

  // If we haven't reached the early window yet, it's still pending
  if (currentTime < earlyStart) {
    return { type: "pending" };
  }

  // No valid prediction yet
  if (!prediction) {
    return { type: "pending" };
  }

  // Check if prediction matches the note
  if (prediction.letter.toUpperCase() !== note.letter.toUpperCase()) {
    return { type: "pending" }; // Wrong letter doesn't cause immediate miss
  }

  // Confidence check
  if (prediction.confidence < CONFIDENCE_THRESHOLD) {
    return { type: "pending" };
  }

  // Hand must be detected
  if (!prediction.handDetected) {
    return { type: "pending" };
  }

  // We have a valid hit! Determine quality based on timing
  // For "hold-to-hit" mechanics: check if the CURRENT GAME TIME is within the visual window
  // (not when the prediction was made - the user may have been holding the sign for a while)

  // VISUAL SYNC: If the note hasn't reached the visual trigger zone yet, defer the hit.
  // This uses currentTime (game clock) not the prediction timestamp.
  const timeUntilTarget = note.time - currentTime;
  if (timeUntilTarget > VISUAL_TRIGGER_WINDOW) {
    // Note is still too far away visually - keep holding!
    return { type: "pending" };
  }

  // Use currentTime for timing quality (since user may have been holding the sign)
  const timeDiff = Math.abs(currentTime - note.time);
  const multiplier = calculateMultiplier(streak);

  let quality: HitQuality;
  let basePoints: number;

  if (timeDiff <= PERFECT_THRESHOLD) {
    // Within ±1.0s of target
    quality = "PERFECT";
    basePoints = PERFECT_POINTS;
  } else if (currentTime < note.time) {
    // Early (within window but before target)
    quality = "GREAT";
    basePoints = GREAT_POINTS;
  } else {
    // Late (after target but within grace)
    quality = "OK";
    basePoints = OK_POINTS;
  }

  return {
    type: "hit",
    quality,
    points: basePoints * multiplier,
    sawLetter: prediction.letter,
  };
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
