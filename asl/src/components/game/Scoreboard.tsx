"use client";

interface ScoreboardProps {
  score: number;
  streak: number;
  lives: number;
}

export function Scoreboard({ score, streak, lives }: ScoreboardProps) {
  const multiplier = Math.min(Math.floor(streak / 3) + 1, 4);

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Score */}
      <div
        className="font-mono text-3xl font-bold tabular-nums"
        style={{ color: "#e0e7ff" }}
      >
        {score.toLocaleString()}
      </div>

      {/* Streak multiplier */}
      {streak > 0 && (
        <div
          className="font-mono text-sm font-semibold"
          style={{ color: "#d946ef" }}
        >
          {streak} streak &times;{multiplier}
        </div>
      )}

      {/* Lives as diamonds */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="text-lg"
            style={{
              color: i < lives ? "#22d3ee" : "rgba(34,211,238,0.2)",
              textShadow: i < lives ? "0 0 8px rgba(34,211,238,0.6)" : "none",
            }}
          >
            &#9670;
          </span>
        ))}
      </div>
    </div>
  );
}
