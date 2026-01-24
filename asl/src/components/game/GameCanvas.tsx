"use client";

import { useGameLoop } from "~/hooks/useGameLoop";
import { DEMO_BEATMAP } from "~/lib/beatmap";
import { WebcamFeed } from "./WebcamFeed";
import { Scoreboard } from "./Scoreboard";
import { TargetWindow } from "./TargetWindow";
import { NoteHighway } from "./NoteHighway";
import { HitFeedback } from "./HitFeedback";
import { LyricsBar } from "./LyricsBar";

const WORD = "TVINKLE"; // Letters used in the demo beatmap

export function GameCanvas() {
  const { state, videoRef, canvasRef, webcamReady, webcamError } = useGameLoop(DEMO_BEATMAP);

  // Calculate which letter index we're at in the word
  const currentLetterIndex = Math.min(
    DEMO_BEATMAP.notes.findIndex((n) => n.time > state.currentTime),
    WORD.length - 1,
  );
  const letterIdx = currentLetterIndex === -1 ? WORD.length - 1 : Math.max(0, currentLetterIndex - 1);
  // Adjust for second repetition
  const adjustedIdx = letterIdx >= WORD.length ? letterIdx % WORD.length : letterIdx;

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
        <LyricsBar word={WORD} currentLetterIndex={adjustedIdx} />
      </div>
    </div>
  );
}
