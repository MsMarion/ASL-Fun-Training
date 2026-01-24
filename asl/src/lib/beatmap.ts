export interface BeatmapNote {
  time: number;
  letter: string;
}

export interface Beatmap {
  title: string;
  notes: BeatmapNote[];
  totalDuration: number;
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
