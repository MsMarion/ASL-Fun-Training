"use client";

import { type BeatmapNote } from "~/lib/beatmap";
import { SignSymbolHighway } from "~/components/SignSymbolHighway";

interface NoteHighwayProps {
  notes: BeatmapNote[];
  currentTime: number;
}

const WINDOW_DURATION = 4; // seconds visible before target
const HIT_ZONE_PERCENT = 15; // hit zone at 15% from left

export function NoteHighway({ notes, currentTime }: NoteHighwayProps) {
  // Filter notes that are within the visible window
  const visibleNotes = notes.filter((note) => {
    const timeUntil = note.time - currentTime;
    return timeUntil > -0.5 && timeUntil < WINDOW_DURATION;
  });

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100px" }}>
      {/* Highway track background */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "linear-gradient(90deg, rgba(217,70,239,0.1) 0%, rgba(13,8,32,0.8) 30%, rgba(13,8,32,0.8) 100%)",
          border: "1px solid rgba(217,70,239,0.2)",
        }}
      />

      {/* Hit zone marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5"
        style={{
          left: `${HIT_ZONE_PERCENT}%`,
          background: "rgba(217,70,239,0.8)",
          boxShadow: "0 0 10px rgba(217,70,239,0.6), 0 0 20px rgba(217,70,239,0.3)",
        }}
      />

      {/* Hit zone glow area */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${HIT_ZONE_PERCENT - 3}%`,
          width: "6%",
          background: "radial-gradient(ellipse at center, rgba(217,70,239,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Notes */}
      {visibleNotes.map((note, i) => {
        const timeUntil = note.time - currentTime;
        // Map timeUntil from [0, WINDOW_DURATION] to [HIT_ZONE_PERCENT, 100]
        const progress = timeUntil / WINDOW_DURATION;
        const leftPercent = HIT_ZONE_PERCENT + progress * (100 - HIT_ZONE_PERCENT);

        // Fade and shrink notes past the hit zone
        const isPast = timeUntil < 0;
        const opacity = isPast ? Math.max(0, 1 + timeUntil * 2) : Math.min(1, (WINDOW_DURATION - timeUntil) / 0.5);
        const scale = isPast ? Math.max(0.5, 1 + timeUntil * 0.5) : 1;

        return (
          <div
            key={`${note.letter}-${note.time}-${i}`}
            className="absolute flex items-center justify-center"
            style={{
              left: `${leftPercent}%`,
              top: "50%",
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              transition: "opacity 0.1s",
              width: "60px",
              height: "70px",
            }}
          >
            <SignSymbolHighway letter={note.letter} className="w-full h-full" />
          </div>
        );
      })}
    </div>
  );
}
