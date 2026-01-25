"use client";

import { useState } from "react";
import { type DebugLogEntry } from "~/hooks/useGameLoop";

export type { DebugLogEntry };

interface DebugLogPanelProps {
  entries: DebugLogEntry[];
  currentTime: number;
}

export function DebugLogPanel({ entries, currentTime }: DebugLogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDelta = (delta: number) => {
    const sign = delta >= 0 ? "+" : "";
    return `Δ${sign}${delta.toFixed(2)}s`;
  };

  const getEntryColor = (type: DebugLogEntry["type"]) => {
    switch (type) {
      case "TRACKING":
        return "text-blue-400";
      case "AI":
        return "text-cyan-400";
      case "HIT":
        return "text-green-400";
      case "MISS":
        return "text-red-400";
    }
  };

  const recentEntries = entries.slice(-8); // Show last 8 entries

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div
        className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg overflow-hidden"
        style={{ width: "400px" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-white/5 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xs font-mono text-gray-300">
            🔍 Debug Log | t={currentTime.toFixed(1)}s
          </span>
          <button className="text-xs text-gray-400 hover:text-white">
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>

        {/* Log entries */}
        {isExpanded && (
          <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
            {recentEntries.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-2">
                Waiting for events...
              </div>
            ) : (
              recentEntries.map((entry, i) => (
                <div
                  key={i}
                  className="text-xs font-mono flex items-center gap-2"
                >
                  <span className="text-gray-500 w-16">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className={`w-20 ${getEntryColor(entry.type)}`}>
                    [{entry.type}]
                  </span>
                  <span className="text-white font-bold w-4">
                    {entry.letter}
                  </span>
                  <span className="text-gray-400 w-16">
                    {formatDelta(entry.delta)}
                  </span>
                  {entry.quality && (
                    <span className="text-yellow-400">→ {entry.quality}</span>
                  )}
                  {entry.confidence !== undefined && (
                    <span className="text-gray-500">
                      ({(entry.confidence * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
