"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreboardProps {
  score: number;
  streak: number;
  lives: number;
}

export function Scoreboard({ score, streak, lives }: ScoreboardProps) {
  const multiplier = Math.min(Math.floor(streak / 3) + 1, 4);
  const [displayScore, setDisplayScore] = useState(score);
  const [scoreBump, setScoreBump] = useState(false);
  const prevLivesRef = useRef(lives);
  const [damagedLife, setDamagedLife] = useState<number | null>(null);

  // Animated score counter
  useEffect(() => {
    if (displayScore === score) return;

    const diff = score - displayScore;
    const step = Math.ceil(Math.abs(diff) / 10);
    const direction = diff > 0 ? 1 : -1;

    const interval = setInterval(() => {
      setDisplayScore((prev) => {
        const next = prev + step * direction;
        if ((direction > 0 && next >= score) || (direction < 0 && next <= score)) {
          return score;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [score, displayScore]);

  // Score bump animation on increase
  useEffect(() => {
    if (score > displayScore) {
      setScoreBump(true);
      const timeout = setTimeout(() => setScoreBump(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [score, displayScore]);

  // Life damage detection
  useEffect(() => {
    if (lives < prevLivesRef.current) {
      // Find which life was lost (leftmost lost life)
      setDamagedLife(lives);
      const timeout = setTimeout(() => setDamagedLife(null), 600);
      return () => clearTimeout(timeout);
    }
    prevLivesRef.current = lives;
  }, [lives]);

  const hasFireEffect = multiplier >= 3;

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Score */}
      <div
        className="font-mono text-3xl font-bold tabular-nums"
        style={{
          color: "#e0e7ff",
          animation: scoreBump ? "score-bump 0.2s ease-out" : "none",
        }}
      >
        {displayScore.toLocaleString()}
      </div>

      {/* Streak multiplier */}
      {streak > 0 && (
        <div
          className="font-mono text-sm font-semibold"
          style={{
            color: "#d946ef",
            animation: hasFireEffect ? "streak-fire 0.8s ease-in-out infinite" : "none",
          }}
        >
          {streak} streak &times;{multiplier}
        </div>
      )}

      {/* Lives as diamonds */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const isAlive = i < lives;
          const isDamaged = i === damagedLife;

          return (
            <span
              key={i}
              className="text-lg"
              style={{
                color: isAlive ? "#22d3ee" : "rgba(34,211,238,0.2)",
                textShadow: isAlive ? "0 0 8px rgba(34,211,238,0.6)" : "none",
                animation: isDamaged ? "life-damage 0.6s ease-out" : "none",
              }}
            >
              &#9670;
            </span>
          );
        })}
      </div>
    </div>
  );
}
