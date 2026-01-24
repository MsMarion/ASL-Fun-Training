"use client";

interface LyricsBarProps {
  word: string;
  currentLetterIndex: number;
}

export function LyricsBar({ word, currentLetterIndex }: LyricsBarProps) {
  return (
    <div
      className="flex items-center justify-center gap-1 py-3"
      style={{ background: "rgba(13,8,32,0.8)" }}
    >
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
