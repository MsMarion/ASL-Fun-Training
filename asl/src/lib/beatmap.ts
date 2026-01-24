export interface BeatmapNote {
  time: number;
  letter: string;
}

export interface Beatmap {
  title: string;
  notes: BeatmapNote[];
  totalDuration: number;
}

// Shared timing constants - single source of truth
export const NOTE_WINDOW_DURATION = 4.0; // How long notes are visible before target (seconds)
export const NOTE_LATE_GRACE = 1.5;      // Grace period after target time for late hits
export const NOTE_TRACKING_WINDOW = 2.0; // When to start tracking for hits (seconds before target)

/**
 * Generate a beatmap from a sequence of letters with fixed spacing
 */
export function generateBeatmap(
  title: string,
  letters: string,
  spacing: number,
  startDelay: number = 2.0
): Beatmap {
  const notes: BeatmapNote[] = Array.from(letters).map((letter, i) => ({
    time: startDelay + i * spacing,
    letter: letter.toUpperCase(),
  }));

  const totalDuration = notes[notes.length - 1]!.time + 3.0; // +3s buffer at end

  return { title, notes, totalDuration };
}

// Spells "TWINKLE" with ~1.5s between notes, repeated once
export const DEMO_BEATMAP: Beatmap = {
  title: "Twinkle Twinkle",
  notes: [
    { time: 2.0, letter: "T" },
    { time: 3.5, letter: "V" },
    { time: 5.0, letter: "I" },
    { time: 6.5, letter: "N" },
    { time: 8.0, letter: "K" },
    { time: 9.5, letter: "L" },
    { time: 11.0, letter: "E" },
    // pause then repeat
    { time: 14.0, letter: "T" },
    { time: 15.5, letter: "V" },
    { time: 17.0, letter: "I" },
    { time: 18.5, letter: "N" },
    { time: 20.0, letter: "K" },
    { time: 21.5, letter: "L" },
    { time: 23.0, letter: "E" },
  ],
  totalDuration: 26.0,
};

// Easy mode: Alternating V and W for testing
export const EASY_MODE = generateBeatmap("Easy Mode", "ABCDE", 3.0);

/**
 * Get beatmap by ID (for dynamic route loading)
 */
export function getBeatmapById(id: string): Beatmap {
  const beatmaps: Record<string, Beatmap> = {
    'demo': DEMO_BEATMAP,
    'easy': EASY_MODE,
  };
  return beatmaps[id.toLowerCase()] ?? DEMO_BEATMAP; // Fallback to demo
}
