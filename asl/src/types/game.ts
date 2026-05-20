import { type BeatmapNote } from "~/lib/beatmap";

export interface DebugLogEntry {
  timestamp: number;
  type: "TRACKING" | "AI" | "HIT" | "MISS";
  letter: string;
  delta: number;
  quality?: "PERFECT" | "GREAT" | "GOOD" | "OK";
  confidence?: number;
}

export type HitQuality = "PERFECT" | "GREAT" | "GOOD" | "OK";

export interface GameState {
  currentTime: number;
  score: number;
  streak: number;
  lives: number;
  currentNote: BeatmapNote | null;
  noteState: "idle" | "success" | "miss";
  feedbackText: string | null;
  feedbackLetter: string | null;
  notes: BeatmapNote[];
  handDetected: boolean;
  isConnected: boolean;
  activeNoteIndex: number;
  lastHitQuality: HitQuality | null;
  streakMilestone: number | null;
  comboMultiplier: number;
  latestPrediction: { letter: string; confidence: number } | null;
  latency: number;
  debugLog: DebugLogEntry[];
  countdownNumber: number | null;
  autoplayEnabled: boolean;
  gameStatus: "lobby" | "countdown" | "playing" | "finished";
}
