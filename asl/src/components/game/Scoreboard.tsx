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
    <div className="glass-panel flex items-center gap-8 px-8 py-3 rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)] bg-black/50 backdrop-blur-md transition-all">
      {/* Lives */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono text-cyan-400 mr-1 font-bold tracking-wider">LIVES</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const isAlive = i < lives;
            const isDamaged = i === damagedLife;
            return (
              <span
                key={i}
                className="text-lg transition-colors"
                style={{
                  color: isAlive ? "#22d3ee" : "rgba(34,211,238,0.2)",
                  textShadow: isAlive ? "0 0 10px rgba(34,211,238,0.8)" : "none",
                  animation: isDamaged ? "life-damage 0.6s ease-out" : "none",
                }}
              >
                &#9670;
              </span>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-cyan-500/20" />

      {/* Score */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-fuchsia-400 font-bold tracking-wider">SCORE</span>
        <div
          className="font-mono text-3xl font-black text-white tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          style={{ animation: scoreBump ? "score-bump 0.2s ease-out" : "none" }}
        >
          {displayScore.toLocaleString()}
        </div>
      </div>

      {/* Streak Multiplier Banner */}
      {streak > 0 && (
        <>
          <div className="w-px h-6 bg-cyan-500/20" />
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40"
            style={{ animation: hasFireEffect ? "streak-fire 0.8s ease-in-out infinite" : "none" }}
          >
            <span className="text-xs font-mono font-bold text-fuchsia-300 tracking-wider">
              {streak} STREAK
            </span>
            <span className="text-sm font-mono font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
              &times;{multiplier}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
