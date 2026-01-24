"use client";

import { SignSymbolPrimary, type SignState } from "~/components/SignSymbolPrimary";

interface TargetWindowProps {
  letter: string | null;
  state: SignState;
  streak?: number;
  isMatching?: boolean; // True when detected sign matches target letter
}

const BORDER_COLORS: Record<SignState, string> = {
  idle: "rgba(34,211,238,0.4)",
  success: "rgba(74,222,128,0.8)",
  miss: "rgba(248,113,113,0.8)",
};

const SHADOW_COLORS: Record<SignState, string> = {
  idle: "rgba(34,211,238,0.2)",
  success: "rgba(74,222,128,0.5)",
  miss: "rgba(248,113,113,0.5)",
};

export function TargetWindow({ letter, state, streak = 0, isMatching = false }: TargetWindowProps) {
  // Progressive glow based on streak
  const glowMultiplier = Math.min(1 + (streak / 10) * 0.8, 2.5);

  // Matching state overrides idle styling with a gold/yellow pulse
  const isMatchingIdle = state === "idle" && isMatching;

  const borderColor = isMatchingIdle
    ? "rgba(250,204,21,0.9)" // Gold/yellow when matching
    : BORDER_COLORS[state];

  const shadowColor = isMatchingIdle
    ? "rgba(250,204,21,0.6)" // Gold glow when matching
    : SHADOW_COLORS[state];

  const enhancedShadow = state === "idle" && streak > 0
    ? `0 0 ${30 * glowMultiplier}px ${shadowColor}, inset 0 0 ${20 * glowMultiplier}px ${shadowColor}`
    : isMatchingIdle
      ? `0 0 40px ${shadowColor}, 0 0 80px rgba(250,204,21,0.3), inset 0 0 25px ${shadowColor}`
      : `0 0 30px ${shadowColor}, inset 0 0 20px ${shadowColor}`;

  return (
    <div
      className={`flex items-center justify-center rounded-2xl border-2 transition-all duration-150 ${isMatchingIdle ? "animate-pulse" : ""}`}
      style={{
        width: "220px",
        height: "260px",
        borderColor: borderColor,
        borderStyle: state === "idle" && !isMatchingIdle ? "dashed" : "solid",
        borderWidth: isMatchingIdle ? "3px" : "2px",
        boxShadow: enhancedShadow,
        background: isMatchingIdle
          ? "rgba(250,204,21,0.08)"
          : "rgba(13,8,32,0.6)",
      }}
    >
      {/* "HOLD IT!" indicator when matching */}
      {isMatchingIdle && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-sm font-bold text-yellow-400 animate-bounce">
            ✓ HOLD IT!
          </span>
        </div>
      )}

      {letter ? (
        <SignSymbolPrimary
          letter={letter}
          state={state}
          className="w-36 h-44"
        />
      ) : (
        <div
          className="text-2xl font-mono opacity-30"
          style={{ color: "#e0e7ff" }}
        >
          ?
        </div>
      )}
    </div>
  );
}
