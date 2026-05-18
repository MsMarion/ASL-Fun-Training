"use client";

import { type BeatmapNote, NOTE_WINDOW_DURATION, NOTE_TRACKING_WINDOW, NOTE_LATE_GRACE } from "~/lib/beatmap";
import { SignSymbolHighway } from "~/components/SignSymbolHighway";

interface NoteHighwayProps {
  notes: BeatmapNote[];
  currentTime: number;
  activeNoteIndex: number;
}

const WINDOW_DURATION = NOTE_WINDOW_DURATION; // Synced with beatmap.ts
const HIT_ZONE_PERCENT = 50; // hit zone centered on screen

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

  // Calculate visual positions for timing windows
  const trackingProgress = NOTE_TRACKING_WINDOW / WINDOW_DURATION;
  const trackingLeft = HIT_ZONE_PERCENT + trackingProgress * (100 - HIT_ZONE_PERCENT);
  
  const lateProgress = -NOTE_LATE_GRACE / WINDOW_DURATION;
  const lateLeft = HIT_ZONE_PERCENT + lateProgress * (100 - HIT_ZONE_PERCENT);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100px" }}>
      {/* Highway track background */}
      <div
        className="glass-panel absolute inset-0 rounded-2xl backdrop-blur-md"
        style={{
          background: "linear-gradient(90deg, rgba(217,70,239,0.15) 0%, rgba(13,8,32,0.75) 30%, rgba(13,8,32,0.75) 100%)",
          border: "1px solid rgba(217,70,239,0.3)",
          boxShadow: "0 0 30px rgba(217,70,239,0.15)",
        }}
      />

      {/* DEBUG: Visual Markers for Windows */}
      {/* Start Tracking Marker */}
      <div 
        className="absolute top-0 bottom-0 w-px border-l border-dashed border-blue-500/50"
        style={{ left: `${trackingLeft}%` }}
      >
        <div className="absolute top-2 -left-2 -translate-x-full text-[8px] text-blue-400 font-mono whitespace-nowrap">
          START TRACK
        </div>
      </div>

      {/* Miss Deadline Marker */}
      <div 
        className="absolute top-0 bottom-0 w-px border-l border-dashed border-red-500/50"
        style={{ left: `${lateLeft}%` }}
      >
         <div className="absolute top-2 left-1 text-[8px] text-red-400 font-mono whitespace-nowrap">
          MISS LIMIT
        </div>
      </div>

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

        // Determine note color/glow based on zone
        let glowColor = "rgba(217,70,239,1)"; // Purple (default/approaching)
        
        if (timeUntil > NOTE_TRACKING_WINDOW) {
           // Approaching (Window -> Tracking)
           glowColor = "rgba(56,189,248,0.8)"; // Cyan
        } else if (timeUntil > 0) {
           // Tracking (Tracking -> Target)
           glowColor = "rgba(74,222,128,0.9)"; // Green (Active/Good to hit)
        } else if (timeUntil >= -NOTE_LATE_GRACE) {
           // Late Grace (Target -> Miss)
           glowColor = "rgba(250,204,21,0.9)"; // Yellow/Gold
        } else {
           // Missed
           glowColor = "rgba(248,113,113,0.9)"; // Red
        }

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
              zIndex: 20, // Keep notes above markers
            }}
          >
            {/* Note trail glow */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${glowColor.replace('1)', '0.4)')} 50%, ${glowColor.replace('1)', '0.6)')} 100%)`,
                filter: "blur(12px)",
                transform: "scaleX(1.5)",
                opacity: 0.6,
              }}
            />
            <div
              className="relative z-10 w-full h-full"
              style={{
                filter: `drop-shadow(0 0 10px ${glowColor})`,
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
