"use client";

import { useRef, useState, useEffect } from "react";
import { useGameLoop } from "~/hooks/useGameLoop";
import { type Beatmap } from "~/lib/beatmap";
import { getBeatmapWord } from "~/lib/beatmapUtils";
import { useVisualEffects } from "~/hooks/useVisualEffects";
import { DEMO_BEATMAP } from "~/lib/beatmap";
import { WebcamFeed } from "./WebcamFeed";
import { Scoreboard } from "./Scoreboard";
import { TargetWindow } from "./TargetWindow";
import { NoteHighway } from "./NoteHighway";
import { HitFeedback } from "./HitFeedback";
import { LATE_GRACE, TRACKING_WINDOW } from "~/lib/gameScoring";
import { LyricsBar } from "./LyricsBar";
import { ParticleOverlay, type ParticleOverlayRef } from "./ParticleOverlay";
import { ScreenFlash } from "./ScreenFlash";
import { EffectsToggle } from "./EffectsToggle";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { DebugLogPanel } from "./DebugLogPanel";
import { SongFinishedOverlay } from "./SongFinishedOverlay";

interface GameCanvasProps {
  beatmap: Beatmap;
}

export function GameCanvas({ beatmap }: GameCanvasProps) {
  const { state, videoRef, canvasRef, webcamReady, webcamError } = useGameLoop(beatmap);

  // Get the word being spelled by the beatmap
  const word = getBeatmapWord(beatmap);

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
  })

  // Use activeNoteIndex for lyrics bar to stay in sync with TargetWindow and NoteHighway
  const adjustedIdx = Math.min(state.activeNoteIndex, word.length - 1);

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
          letter={state.feedbackLetter ?? state.currentNote?.letter ?? null}
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
        <LyricsBar word={word} currentLetterIndex={adjustedIdx} />
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

      {/* Debug Info: Current Target - bottom-right */}
      <div className="absolute bottom-20 right-4 z-20 pointer-events-none">
        <div className="bg-black/60 backdrop-blur text-white px-3 py-2 rounded-md border border-white/10 shadow-sm">
          <div className="text-[10px] text-gray-400 font-mono mb-1">TARGET</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-fuchsia-400">
              {state.currentNote?.letter ?? "—"}
            </span>
            <div className="flex flex-col text-[10px] font-mono text-gray-300">
              <span>Time: {state.currentNote?.time?.toFixed(1) ?? "—"}s</span>
              <span>Now: {state.currentTime.toFixed(1)}s</span>
              <span>State: <span className={
                state.noteState === "success" ? "text-green-400" :
                state.noteState === "miss" ? "text-red-400" : "text-gray-400"
              }>{state.noteState}</span></span>
            </div>
          </div>
          {state.currentNote && (
            <div className="mt-1 text-[9px] font-mono text-gray-500">
              Δ {(state.currentNote.time - state.currentTime).toFixed(2)}s {state.currentNote.time > state.currentTime ? "until" : "ago"}
            </div>
          )}
        </div>
      </div>

      {/* Debug Log Panel */}
      <DebugLogPanel entries={state.debugLog} currentTime={state.currentTime} />
      
      {/* Game Over Transition */}
      <SongFinishedOverlay show={state.gameStatus === "finished"} />
    </div>
  );
}