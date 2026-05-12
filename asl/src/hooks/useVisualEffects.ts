"use client";

import { useEffect, useRef } from "react";
import { type ParticleEngine } from "~/lib/particleEngine";
import { type GameState } from "~/types/game";

interface UseVisualEffectsOptions {
  gameState: GameState;
  particleEngine: ParticleEngine | null;
  targetWindowCenter: { x: number; y: number };
  enabled?: boolean;
}

export function useVisualEffects({
  gameState,
  particleEngine,
  targetWindowCenter,
  enabled = true,
}: UseVisualEffectsOptions) {
  const prevNoteStateRef = useRef<"idle" | "success" | "miss">("idle");
  const prevStreakRef = useRef(0);
  const ambientIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streakTrailIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hit feedback particles
  useEffect(() => {
    if (!enabled || !particleEngine) return;

    const { noteState, lastHitQuality, streak } = gameState;

    // Detect state transition to success
    if (noteState === "success" && prevNoteStateRef.current !== "success") {
      const { x, y } = targetWindowCenter;

      // Emit burst based on hit quality
      if (lastHitQuality === "PERFECT") {
        particleEngine.emit(x, y, "perfectBurst");
      } else if (lastHitQuality === "GREAT") {
        particleEngine.emit(x, y, "greatBurst");
      } else if (lastHitQuality === "OK") {
        particleEngine.emit(x, y, "okBurst");
      }
    }

    prevNoteStateRef.current = noteState;
  }, [gameState.noteState, gameState.lastHitQuality, particleEngine, targetWindowCenter, enabled]);

  // Streak milestone particles
  useEffect(() => {
    if (!enabled || !particleEngine) return;

    const { streakMilestone } = gameState;

    if (streakMilestone) {
      const { x, y } = targetWindowCenter;
      particleEngine.emit(x, y, "milestone");
    }
  }, [gameState.streakMilestone, particleEngine, targetWindowCenter, enabled]);

  // Streak trail particles (when streak >= 3)
  useEffect(() => {
    if (!enabled || !particleEngine) return;

    const { streak } = gameState;

    // Start emitting trail particles
    if (streak >= 3) {
      if (!streakTrailIntervalRef.current) {
        streakTrailIntervalRef.current = setInterval(() => {
          const { x, y } = targetWindowCenter;
          // Add slight randomness to position
          const offsetX = (Math.random() - 0.5) * 40;
          const offsetY = (Math.random() - 0.5) * 40;
          particleEngine.emit(x + offsetX, y + offsetY, "streakTrail");
        }, 200);
      }
    } else {
      // Stop trail particles
      if (streakTrailIntervalRef.current) {
        clearInterval(streakTrailIntervalRef.current);
        streakTrailIntervalRef.current = null;
      }
    }

    return () => {
      if (streakTrailIntervalRef.current) {
        clearInterval(streakTrailIntervalRef.current);
        streakTrailIntervalRef.current = null;
      }
    };
  }, [gameState.streak, particleEngine, targetWindowCenter, enabled]);

  // Ambient particles (always floating)
  useEffect(() => {
    if (!enabled || !particleEngine) return;

    // Emit ambient particles from screen edges
    ambientIntervalRef.current = setInterval(() => {
      if (typeof window === "undefined") return;

      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let x = 0;
      let y = 0;

      switch (edge) {
        case 0: // top
          x = Math.random() * window.innerWidth;
          y = 0;
          break;
        case 1: // right
          x = window.innerWidth;
          y = Math.random() * window.innerHeight;
          break;
        case 2: // bottom
          x = Math.random() * window.innerWidth;
          y = window.innerHeight;
          break;
        case 3: // left
          x = 0;
          y = Math.random() * window.innerHeight;
          break;
      }

      particleEngine.emit(x, y, "ambient");
    }, 500);

    return () => {
      if (ambientIntervalRef.current) {
        clearInterval(ambientIntervalRef.current);
        ambientIntervalRef.current = null;
      }
    };
  }, [particleEngine, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ambientIntervalRef.current) {
        clearInterval(ambientIntervalRef.current);
      }
      if (streakTrailIntervalRef.current) {
        clearInterval(streakTrailIntervalRef.current);
      }
    };
  }, []);
}
