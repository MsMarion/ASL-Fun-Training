"use client";

import { type BeatmapNote } from "~/lib/beatmap";
import { SignSymbolHighway } from "~/components/SignSymbolHighway";
import { useMemo } from "react";

interface TestingNoteHighwayProps {
  notes: BeatmapNote[];
  elapsed: number;
}

// Configuration
const VISIBLE_DURATION = 4.0; // Show notes 4 seconds into the future
const LATE_WINDOW = 1.0; // Show notes 1 second into the past
const TOTAL_WINDOW = VISIBLE_DURATION + LATE_WINDOW;

// Percentages for the highway
const TRACK_HEIGHT_PX = 600; 
const TARGET_LINE_PERCENT = 80; // Target line is 80% down the track

export function TestingNoteHighway({ notes, elapsed }: TestingNoteHighwayProps) {
  
  // Filter visible notes
  const visibleNotes = useMemo(() => {
    return notes.filter(note => {
        const timeDiff = note.time - elapsed;
        // Show if within [ -LATE_WINDOW, VISIBLE_DURATION ]
        return timeDiff > -LATE_WINDOW && timeDiff < VISIBLE_DURATION;
    });
  }, [notes, elapsed]);

  return (
    <div className="relative w-64 h-[600px] overflow-hidden bg-black/40 border-x-2 border-purple-500/30 rounded-lg mx-8 backdrop-blur-sm">
        {/* Track Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-purple-900/30" />

        {/* Target Line (The "Now" Line) */}
        <div 
            className="absolute left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10"
            style={{ top: `${TARGET_LINE_PERCENT}%` }}
        >
             <div className="absolute right-0 -top-6 text-xs font-mono text-cyan-400">NOW</div>
        </div>
        
        {/* Early Warning Line (e.g. 2s before) */}
        <div 
             className="absolute left-0 right-0 h-px border-t border-dashed border-white/20 z-0"
             style={{ top: `${TARGET_LINE_PERCENT - (2.0 / TOTAL_WINDOW) * 100}%` }} // Approximate visual
        />

        {/* Notes */}
        {visibleNotes.map((note, i) => {
            const timeDiff = note.time - elapsed; // Positive = Future, Negative = Past
            
            // Map timeDiff to Vertical Position (%)
            // timeDiff = VISIBLE_DURATION -> 0% (Top)
            // timeDiff = 0 -> TARGET_LINE_PERCENT (Target)
            // timeDiff = -LATE_WINDOW -> 100% (Bottom)
            
            // We need a linear mapping.
            // When timeDiff = 0, y = TARGET_LINE_PERCENT
            // When timeDiff = VISIBLE_DURATION, y = 0 (or close to top)
            
            // Pixels per second speed?
            // Let's deduce scale factor based on 0 -> Target
            
            // Let's try:
            // position = TARGET_LINE_PERCENT - (timeDiff / VISIBLE_DURATION) * TARGET_LINE_PERCENT ???
            // If timeDiff = VISIBLE, pos = 0. Correct.
            // If timeDiff = 0, pos = 80. Correct.
            // If timeDiff = -1, pos = 80 - (-1/4)*80 = 80 + 20 = 100. Correct!
            
            // Wait, assumes VISIBLE_DURATION (4s) corresponds exactly to the top 80% space.
            // And 1s corresponds to the bottom 20% space.
            // 4s / 80% = 0.05 s/%? No.
            // 80% / 4s = 20 %/s
            // 20% / 1s = 20 %/s
            // Perfect match. So Scale factor is consistent.
            
            const topPercent = TARGET_LINE_PERCENT - (timeDiff * (TARGET_LINE_PERCENT / VISIBLE_DURATION));
            
            // Styling based on proximity
            const isLate = timeDiff < 0;
            const isActionable = timeDiff <= 0 && timeDiff >= -1.0; // In the window
            const opacity = isLate ? 1 - (Math.abs(timeDiff) / LATE_WINDOW) : Math.min(1, (VISIBLE_DURATION - timeDiff));

            return (
                <div
                    key={`${note.letter}-${note.time}`}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20"
                    style={{
                        top: `${topPercent}%`,
                        opacity,
                        marginTop: '-24px', // Offset to center on line
                    }}
                >
                    <div className={`
                        w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xl shadow-lg
                        ${isLate 
                            ? "border-red-500 bg-red-900/50 text-red-200" 
                            : timeDiff < 2.0 
                                ? "border-green-400 bg-green-900/50 text-white animate-pulse" 
                                : "border-purple-500 bg-black/50 text-gray-400"}
                    `}>
                        {note.letter}
                    </div>
                </div>
            )
        })}
    </div>
  );
}
