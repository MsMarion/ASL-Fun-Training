"use client";

import { useRef, useState, useEffect } from "react";
import { useGameLoop } from "~/hooks/useGameLoop";
import { useVisualEffects } from "~/hooks/useVisualEffects";
import { DEMO_BEATMAP, type Beatmap } from "~/lib/beatmap";
import { WebcamFeed } from "./WebcamFeed";
import { Scoreboard } from "./Scoreboard";
import { TargetWindow } from "./TargetWindow";
import { NoteHighway } from "./NoteHighway";
import { HitFeedback } from "./HitFeedback";
import { LyricsBar } from "./LyricsBar";
import { ParticleOverlay, type ParticleOverlayRef } from "./ParticleOverlay";
import { ScreenFlash } from "./ScreenFlash";
import { EffectsToggle } from "./EffectsToggle";
import { SynthwaveBackground } from "./SynthwaveBackground";

interface GameCanvasProps {
  beatmap?: Beatmap;
}

export function GameCanvas({ beatmap = DEMO_BEATMAP }: GameCanvasProps) {
  const { state, videoRef, canvasRef, webcamReady, webcamError } = useGameLoop(beatmap);

  // Derive word from beatmap notes
  const WORD = beatmap.notes.map(note => note.letter).join('');
  const particleOverlayRef = useRef<ParticleOverlayRef>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [targetWindowCenter, setTargetWindowCenter] = useState({ x: 0, y: 0 });

  // Calculate target window center position
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTargetWindowCenter({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
  }, []);

  // Wire up visual effects
  useVisualEffects({
    gameState: state,
    particleEngine: particleOverlayRef.current?.engine ?? null,
    targetWindowCenter,
    enabled: effectsEnabled,
  });

  // Calculate which letter index we're at in the word
  const currentLetterIndex = Math.min(
    DEMO_BEATMAP.notes.findIndex((n) => n.time > state.currentTime),
    WORD.length - 1,
  );
  const letterIdx = currentLetterIndex === -1 ? WORD.length - 1 : Math.max(0, currentLetterIndex - 1);
  // Adjust for second repetition
  const adjustedIdx = letterIdx >= WORD.length ? letterIdx % WORD.length : letterIdx;

  // Dynamic background color based on streak (warmer with higher streak)
  const bgHue = 250 - Math.min(state.streak * 2, 40); // Shifts from blue-purple toward magenta
  const bgColor = `hsl(${bgHue}, 40%, 6%)`;

  // Dynamic vignette intensity
  const vignetteOpacity = Math.min(0.3 + (state.streak / 25) * 0.5, 0.8);

  // Trigger screen flash on PERFECT hits
  const shouldFlash = state.lastHitQuality === "PERFECT" && state.noteState === "success";

  return (
    <div
      className="game-grid relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: bgColor, transition: "background 0.5s ease-out" }}
    >
      {/* Particle overlay */}
      <ParticleOverlay ref={particleOverlayRef} enabled={effectsEnabled} />

      {/* Screen flash on PERFECT */}
      <ScreenFlash trigger={shouldFlash} />

      {/* Synthwave Background */}
      <SynthwaveBackground />

      {/* Top bar: Webcam + Scoreboard + Effects Toggle */}
      <div className="relative z-10 flex items-start justify-between p-4">
        <WebcamFeed
          videoRef={videoRef}
          canvasRef={canvasRef}
          isReady={webcamReady}
          error={webcamError}
          isConnected={state.isConnected}
          handDetected={state.handDetected}
        />
        <div className="flex flex-col items-end gap-2">
          <Scoreboard score={state.score} streak={state.streak} lives={state.lives} />
          <EffectsToggle enabled={effectsEnabled} onToggle={() => setEffectsEnabled(!effectsEnabled)} />
        </div>
      </div>

      {/* Center area: Target symbol + feedback */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <TargetWindow
          letter={state.currentNote?.letter ?? null}
          state={state.noteState}
          streak={state.streak}
          isMatching={
            state.noteState === "idle" &&
            state.currentNote !== null &&
            state.latestPrediction !== null &&
            state.latestPrediction.letter === state.currentNote.letter &&
            state.latestPrediction.confidence >= 0.5
          }
        />
        <HitFeedback
          text={state.feedbackText}
          streak={state.streak}
          streakMilestone={state.streakMilestone}
          comboMultiplier={state.comboMultiplier}
        />
      </div>

      {/* Bottom: Note highway + lyrics */}
      <div className="relative z-10 flex flex-col gap-2 p-4">
        <NoteHighway
          notes={state.notes}
          currentTime={state.currentTime}
          activeNoteIndex={state.activeNoteIndex}
        />
        <LyricsBar word={WORD} currentLetterIndex={adjustedIdx} />
      </div>

      {/* Debug Info: Detected Sign - Compact, bottom-left to be secondary */}
      {state.latestPrediction && (
        <div className="absolute bottom-20 left-4 z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur text-white px-2 py-1 rounded-md border border-white/10 shadow-sm flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono">AI:</span>
            <span className="text-lg font-bold text-cyan-400">
              {state.latestPrediction.letter}
            </span>
            <span className="text-[10px] text-green-400/80 font-mono">
              {Math.min(100, (state.latestPrediction.confidence * 100)).toFixed(0)}%
            </span>
            <span className={`text-[10px] font-mono ${state.latency < 100 ? "text-green-400/60" :
              state.latency < 200 ? "text-yellow-400/60" : "text-red-400/60"
              }`}>
              {state.latency}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
