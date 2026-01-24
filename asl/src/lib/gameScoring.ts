/**
 * Pure scoring logic for ASL Fun Training game.
 * Implements "early OK, late penalized" timing mechanic.
 */

import { type BeatmapNote } from "./beatmap";

// Timing windows (in seconds)
export const EARLY_WINDOW = 5.0; // Notes become hittable 5s before target time
export const LATE_GRACE = 0.8; // Deadline after target time
export const PERFECT_THRESHOLD = 0.3; // ±0.3s for PERFECT
export const CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence to accept prediction
export const VISUAL_TRIGGER_WINDOW = 0.5; // Only trigger hit when note is visually close (0.5s)
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
  | { type: "hit"; quality: HitQuality; points: number }
  | { type: "miss" }
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
    return { type: "miss" };
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
  // Calculate relative time of the prediction (seconds from game start)
  // We have a valid hit! Determine quality based on timing
  // Calculate relative time of the prediction (seconds from game start)
  const relativePredTime = (prediction.clientTimestamp - gameStartTime) - INPUT_OFFSET;

  // VISUAL SYNC: If the hit is VALID but visually "Too Early" (too far from target),
  // defer it. We want the user to hold the sign until it hits the target.
  if (note.time - relativePredTime > VISUAL_TRIGGER_WINDOW) {
    return { type: "pending" };
  }

  const timeDiff = Math.abs(relativePredTime - note.time);
  const multiplier = calculateMultiplier(streak);

  let quality: HitQuality;
  let basePoints: number;

  if (timeDiff <= PERFECT_THRESHOLD) {
    // Within ±0.3s of target
    quality = "PERFECT";
    basePoints = PERFECT_POINTS;
  } else if (relativePredTime < note.time) {
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
