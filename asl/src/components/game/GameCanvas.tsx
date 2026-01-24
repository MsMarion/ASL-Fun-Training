"use client";

import { useGameLoop } from "~/hooks/useGameLoop";
import { type Beatmap } from "~/lib/beatmap";
import { getBeatmapWord } from "~/lib/beatmapUtils";
import { WebcamFeed } from "./WebcamFeed";
import { Scoreboard } from "./Scoreboard";
import { TargetWindow } from "./TargetWindow";
import { NoteHighway } from "./NoteHighway";
import { HitFeedback } from "./HitFeedback";
import { LyricsBar } from "./LyricsBar";

interface GameCanvasProps {
  beatmap: Beatmap;
}

export function GameCanvas({ beatmap }: GameCanvasProps) {
  const { state, videoRef, canvasRef, webcamReady, webcamError } = useGameLoop(beatmap);

  // Get the word being spelled by the beatmap
  const word = getBeatmapWord(beatmap);

  // Calculate which letter index we're at in the word
  const currentLetterIndex = Math.min(
    beatmap.notes.findIndex((n) => n.time > state.currentTime),
    word.length - 1,
  );
  const letterIdx = currentLetterIndex === -1 ? word.length - 1 : Math.max(0, currentLetterIndex - 1);

  return (
    <div
      className="game-grid relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: "#0d0820" }}
    >
      {/* Animated grid background */}
      <div className="game-grid-animate pointer-events-none absolute inset-0" />

      {/* Top bar: Webcam + Scoreboard */}
      <div className="relative z-10 flex items-start justify-between p-4">
        <WebcamFeed
          videoRef={videoRef}
          canvasRef={canvasRef}
          isReady={webcamReady}
          error={webcamError}
          isConnected={state.isConnected}
          handDetected={state.handDetected}
        />
        <Scoreboard score={state.score} streak={state.streak} lives={state.lives} />
      </div>

      {/* Center area: Target symbol + feedback */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <TargetWindow
          letter={state.currentNote?.letter ?? null}
          state={state.noteState}
        />
        <HitFeedback text={state.feedbackText} />
      </div>

      {/* Bottom: Note highway + lyrics */}
      <div className="relative z-10 flex flex-col gap-2 p-4">
        <NoteHighway notes={state.notes} currentTime={state.currentTime} />
        <LyricsBar word={word} currentLetterIndex={letterIdx} />
      </div>

      {/* Song title display */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div
          className="font-mono text-sm font-semibold px-4 py-2 rounded-full"
          style={{
            background: "rgba(13,8,32,0.8)",
            color: "#e0e7ff",
            border: "1px solid rgba(217,70,239,0.3)",
          }}
        >
          {beatmap.title}
        </div>
      </div>
    </div>
  );
}