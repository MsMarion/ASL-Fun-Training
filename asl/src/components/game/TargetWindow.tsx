"use client";

import { SignSymbolPrimary, type SignState } from "~/components/SignSymbolPrimary";

interface TargetWindowProps {
  letter: string | null;
  state: SignState;
  streak?: number;
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

export function TargetWindow({ letter, state, streak = 0 }: TargetWindowProps) {
  // Progressive glow based on streak
  const glowMultiplier = Math.min(1 + (streak / 10) * 0.8, 2.5);

  const shadowColor = SHADOW_COLORS[state];
  const enhancedShadow = state === "idle" && streak > 0
    ? `0 0 ${30 * glowMultiplier}px ${shadowColor}, inset 0 0 ${20 * glowMultiplier}px ${shadowColor}`
    : `0 0 30px ${shadowColor}, inset 0 0 20px ${shadowColor}`;

  return (
    <div
      className="flex items-center justify-center rounded-2xl border-2 transition-all duration-300"
      style={{
        width: "220px",
        height: "260px",
        borderColor: BORDER_COLORS[state],
        borderStyle: state === "idle" ? "dashed" : "solid",
        boxShadow: enhancedShadow,
        background: "rgba(13,8,32,0.6)",
      }}
    >
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
