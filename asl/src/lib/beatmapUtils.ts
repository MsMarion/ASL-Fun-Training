import { type Beatmap, type BeatmapNote } from "./beatmap";
import { type Song } from "~/types/song";

/**
 * Converts a Song's interactions into a Beatmap format
 * for use in the game.
 */
export function songToBeatmap(song: Song): Beatmap {
  // Sort interactions by timeElapsed to ensure proper ordering
  const sortedInteractions = [...song.interactions].sort(
    (a, b) => a.timeElapsed - b.timeElapsed
  );

  // Convert interactions to beatmap notes
  const notes: BeatmapNote[] = sortedInteractions.map((interaction) => ({
    time: interaction.timeElapsed,
    letter: interaction.key.toUpperCase(),
  }));

  // Calculate total duration (last note time + buffer)
  const lastNoteTime = notes.length > 0 ? notes[notes.length - 1].time : 0;
  const totalDuration = lastNoteTime + 3.0; // Add 3 seconds after last note

  return {
    title: song.songName,
    notes,
    totalDuration,
    audioUrl: song.audioUrl,
  };
}

/**
 * Validates that a beatmap has valid data
 */
export function validateBeatmap(beatmap: Beatmap): boolean {
  if (!beatmap.notes || beatmap.notes.length === 0) {
    return false;
  }

  // Check that all notes have valid times and letters
  return beatmap.notes.every(
    (note) =>
      typeof note.time === "number" &&
      note.time >= 0 &&
      typeof note.letter === "string" &&
      note.letter.length === 1
  );
}

/**
 * Gets the word/phrase being spelled by the beatmap
 */
export function getBeatmapWord(beatmap: Beatmap): string {
  return beatmap.notes.map((note) => note.letter).join("");
}