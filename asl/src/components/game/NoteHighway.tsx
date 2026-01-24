"use client";

import { type BeatmapNote } from "~/lib/beatmap";
import { SignSymbolHighway } from "~/components/SignSymbolHighway";

interface NoteHighwayProps {
  notes: BeatmapNote[];
  currentTime: number;
  activeNoteIndex: number;
}

const WINDOW_DURATION = 4; // seconds visible before target
const HIT_ZONE_PERCENT = 15; // hit zone at 15% from left

export function NoteHighway({ notes, currentTime, activeNoteIndex }: NoteHighwayProps) {
  // Filter notes that are within the visible window AND not yet processed
  const visibleNotes = notes.filter((note, index) => {
    // Hide notes that we've already passed (hit or miss)
    if (index < activeNoteIndex) return false;

    const timeUntil = note.time - currentTime;
    return timeUntil > -0.5 && timeUntil < WINDOW_DURATION;
  });

  // Find closest upcoming note for timing arc
  const upcomingNote = notes.find((note) => note.time > currentTime);
  const timeUntilNext = upcomingNote ? upcomingNote.time - currentTime : null;
  const isNoteApproaching = timeUntilNext !== null && timeUntilNext < 0.5;

  // Timing arc progress (fill from 0 to 1 as note approaches)
  const arcProgress = timeUntilNext !== null && timeUntilNext < 2
    ? Math.max(0, 1 - timeUntilNext / 2)
    : 0;

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

      {/* Hit zone marker - center target line */}
      <div
        className="absolute top-0 bottom-0 w-1"
        style={{
          left: `${HIT_ZONE_PERCENT}%`,
          background: "rgba(217,70,239,1)",
          boxShadow: isNoteApproaching
            ? "0 0 20px rgba(217,70,239,0.9), 0 0 40px rgba(217,70,239,0.5)"
            : "0 0 10px rgba(217,70,239,0.6), 0 0 20px rgba(217,70,239,0.3)",
          transition: "box-shadow 0.3s ease-out",
          zIndex: 10,
        }}
      />

      {/* VISUAL HINT: Large "valid hit zone" band showing the forgiving window */}
      <div
        className="absolute top-1 bottom-1 rounded-md"
        style={{
          left: `${HIT_ZONE_PERCENT - 8}%`,
          width: "25%",
          background: "linear-gradient(90deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.3) 30%, rgba(217,70,239,0.4) 80%, rgba(220,38,38,0.15) 100%)",
          border: "1px dashed rgba(255,255,255,0.2)",
          zIndex: 5,
        }}
      >
        {/* Labels for timing zones */}
        <div className="absolute top-0 left-1 text-[8px] text-green-400/70 font-mono">EARLY</div>
        <div className="absolute top-0 right-1 text-[8px] text-red-400/70 font-mono">LATE</div>
      </div>

      {/* Hit zone glow area with pulse */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${HIT_ZONE_PERCENT - 5}%`,
          width: "10%",
          background: "radial-gradient(ellipse at center, rgba(217,70,239,0.2) 0%, transparent 70%)",
          animation: isNoteApproaching ? "hit-zone-pulse 0.5s ease-in-out infinite" : "none",
          zIndex: 8,
        }}
      />

      {/* Timing arc (SVG circle) */}
      <svg
        className="pointer-events-none absolute"
        style={{
          left: `${HIT_ZONE_PERCENT}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "80px",
          height: "80px",
        }}
      >
        <circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke="rgba(217,70,239,0.3)"
          strokeWidth="2"
        />
        <circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke="rgba(217,70,239,0.9)"
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 35}`}
          strokeDashoffset={`${2 * Math.PI * 35 * (1 - arcProgress)}`}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 0.05s linear",
          }}
        />
      </svg>

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

        // Note brightness: dim purple to bright magenta as it approaches
        const brightness = Math.max(0.5, 1 - timeUntil / WINDOW_DURATION);
        const trailOpacity = Math.max(0, brightness - 0.3);

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
            {/* Note trail glow */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(217,70,239,${trailOpacity * 0.4}) 50%, rgba(217,70,239,${trailOpacity * 0.6}) 100%)`,
                filter: "blur(12px)",
                transform: "scaleX(1.5)",
                opacity: trailOpacity,
              }}
            />
            <div
              className="relative z-10 w-full h-full"
              style={{
                filter: `brightness(${brightness}) drop-shadow(0 0 ${8 * brightness}px rgba(217,70,239,${brightness * 0.8}))`,
              }}
            >
              <SignSymbolHighway
                letter={note.letter}
                className="w-full h-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
