"use client";

interface LyricsBarProps {
  word: string;
  currentLetterIndex: number;
}

export function LyricsBar({ word, currentLetterIndex }: LyricsBarProps) {
  return (
    <div className="glass-panel flex items-center justify-center gap-3 py-3 px-8 rounded-2xl border border-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.1)] bg-black/50 backdrop-blur-md">
      {word.split("").map((char, i) => (
        <span
          key={i}
          className="font-mono text-2xl font-bold tracking-widest"
          style={{
            color: i === currentLetterIndex
              ? "#d946ef"
              : i < currentLetterIndex
                ? "rgba(217,70,239,0.4)"
                : "rgba(224,231,255,0.4)",
            textShadow: i === currentLetterIndex
              ? "0 0 10px rgba(217,70,239,0.8)"
              : "none",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
