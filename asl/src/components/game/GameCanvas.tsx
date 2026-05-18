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
  const { state, videoRef, canvasRef, webcamReady, webcamError, startGame, toggleAutoplay } = useGameLoop(beatmap);

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
  });

  const adjustedIdx = Math.min(state.activeNoteIndex, word.length - 1);
  const shouldFlash = state.lastHitQuality === "PERFECT" && state.noteState === "success";

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-transparent pointer-events-auto">
      {/* Particle overlay */}
      <ParticleOverlay ref={particleOverlayRef} enabled={effectsEnabled} />

      {/* Screen flash on PERFECT */}
      <ScreenFlash trigger={shouldFlash} />

      {/* Top Center Marquee: Scoreboard */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
        <Scoreboard score={state.score} streak={state.streak} lives={state.lives} />
      </div>

      {/* Top Left Cyber Webcam Feed */}
      <div className="absolute top-28 left-8 z-40">
        <WebcamFeed
          videoRef={videoRef}
          canvasRef={canvasRef}
          isReady={webcamReady}
          error={webcamError}
          isConnected={state.isConnected}
          handDetected={state.handDetected}
        />
      </div>

      {/* Bottom Right Effects Toggle */}
      <div className="absolute bottom-6 right-8 z-40">
        <EffectsToggle enabled={effectsEnabled} onToggle={() => setEffectsEnabled(!effectsEnabled)} />
      </div>

      {/* Lobby Modal */}
      {state.gameStatus === "lobby" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full p-8 rounded-3xl border border-fuchsia-500/50 shadow-[0_0_50px_rgba(217,70,239,0.3)] text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 tracking-wider mb-2">
              {beatmap.title}
            </h1>
            <p className="text-fuchsia-300 font-mono text-sm mb-8 tracking-widest uppercase">
              {beatmap.notes.length} NOTES • {(beatmap.totalDuration).toFixed(0)}s TRACK
            </p>
            <div className="relative inline-block">
              <button
                onClick={startGame}
                className="relative z-10 px-12 py-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-600 text-white font-mono font-black text-2xl tracking-widest shadow-[0_0_30px_rgba(45,226,230,0.6)] hover:shadow-[0_0_50px_rgba(217,70,239,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                START TRACK 🎵
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {state.gameStatus === "countdown" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div key={state.countdownNumber} className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-fuchsia-500 to-yellow-400 drop-shadow-[0_0_80px_rgba(217,70,239,0.8)] animate-bounce font-mono">
            {state.countdownNumber}
          </div>
        </div>
      )}

      {/* Central Area: Target Window & Feedback */}
      <div className="absolute top-40 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <TargetWindow
          letter={state.feedbackLetter ?? state.currentNote?.letter ?? null}
          state={state.noteState}
          streak={state.streak}
          isMatching={
            state.noteState === "idle" &&
            state.currentNote !== null &&
            state.latestPrediction !== null &&
            state.latestPrediction.letter === state.currentNote.letter &&
            state.latestPrediction.confidence >= 0.45
          }
        />
        <div className="mt-4 relative h-16 w-full flex items-center justify-center">
          <HitFeedback
            text={state.feedbackText}
            streak={state.streak}
            streakMilestone={state.streakMilestone}
            comboMultiplier={state.comboMultiplier}
          />
        </div>
      </div>

      {/* Bottom Area: Highway & Lyrics */}
      <div className="absolute bottom-28 left-0 w-full z-20 px-8">
        <NoteHighway
          notes={state.notes}
          currentTime={state.currentTime}
          activeNoteIndex={state.activeNoteIndex}
        />
      </div>
      <div className="absolute bottom-12 left-0 w-full z-20 px-8">
        <LyricsBar word={word} currentLetterIndex={adjustedIdx} />
      </div>

      {/* Bottom Left Controls: Autoplay Bot Toggle & AI Stats */}
      <div className="absolute bottom-6 left-8 z-30 flex items-center gap-3">
        <button
          onClick={toggleAutoplay}
          className={`px-4 py-2 rounded-2xl font-mono text-xs font-black tracking-widest border transition-all cursor-pointer shadow-lg flex items-center gap-2 ${
            state.autoplayEnabled
              ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white border-white/80 shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-pulse"
              : "bg-black/60 backdrop-blur-md text-gray-400 border-white/10 hover:border-white/30"
          }`}
        >
          <span>🤖</span>
          <span>AUTOPLAY BOT: {state.autoplayEnabled ? "PERFECT ON" : "OFF"}</span>
        </button>

        {state.latestPrediction && (
          <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl border border-white/10 shadow-sm flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-400">AI:</span>
            <span className="text-base font-bold text-cyan-400">{state.latestPrediction.letter}</span>
            <span className="text-green-400">{(state.latestPrediction.confidence * 100).toFixed(0)}%</span>
            <span className="text-fuchsia-400">{state.latency}ms</span>
          </div>
        )}
      </div>

      {/* Debug Log Panel */}
      <DebugLogPanel entries={state.debugLog} currentTime={state.currentTime} />

      {/* Game Over Transition */}
      <SongFinishedOverlay show={state.gameStatus === "finished"} />
    </div>
  );
}