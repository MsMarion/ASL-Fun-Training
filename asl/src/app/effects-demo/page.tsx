"use client";

import { useRef, useState, useEffect } from "react";
import { useMockGameLoop } from "~/hooks/useMockGameLoop";
import { useVisualEffects } from "~/hooks/useVisualEffects";
import { DEMO_BEATMAP } from "~/lib/beatmap";
import { Scoreboard } from "~/components/game/Scoreboard";
import { TargetWindow } from "~/components/game/TargetWindow";
import { NoteHighway } from "~/components/game/NoteHighway";
import { HitFeedback } from "~/components/game/HitFeedback";
import { LyricsBar } from "~/components/game/LyricsBar";
import { ParticleOverlay, type ParticleOverlayRef } from "~/components/game/ParticleOverlay";
import { ScreenFlash } from "~/components/game/ScreenFlash";
import { EffectsToggle } from "~/components/game/EffectsToggle";

export default function EffectsDemoPage() {
  const state = useMockGameLoop(DEMO_BEATMAP);

  // Derive word from beatmap notes
  const WORD = DEMO_BEATMAP.notes.map(note => note.letter).join('');
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

  // Calculate letter index
  const currentLetterIndex = Math.min(
    DEMO_BEATMAP.notes.findIndex((n) => n.time > state.currentTime),
    WORD.length - 1,
  );
  const letterIdx = currentLetterIndex === -1 ? WORD.length - 1 : Math.max(0, currentLetterIndex - 1);
  const adjustedIdx = letterIdx >= WORD.length ? letterIdx % WORD.length : letterIdx;

  // Dynamic background and vignette
  const bgHue = 250 - Math.min(state.streak * 2, 40);
  const bgColor = `hsl(${bgHue}, 40%, 6%)`;
  const vignetteOpacity = Math.min(0.3 + (state.streak / 25) * 0.5, 0.8);
  const shouldFlash = state.lastHitQuality === "PERFECT" && state.noteState === "success";

  // Manual trigger functions for control panel
  const triggerEffect = (effect: string) => {
    const engine = particleOverlayRef.current?.engine;
    if (!engine) return;

    const { x, y } = targetWindowCenter;

    switch (effect) {
      case "perfect":
        engine.emit(x, y, "perfectBurst");
        break;
      case "great":
        engine.emit(x, y, "greatBurst");
        break;
      case "ok":
        engine.emit(x, y, "okBurst");
        break;
      case "milestone":
        engine.emit(x, y, "milestone");
        break;
    }
  };

  return (
    <div
      className="game-grid relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: bgColor, transition: "background 0.5s ease-out" }}
    >
      {/* Particle overlay */}
      <ParticleOverlay ref={particleOverlayRef} enabled={effectsEnabled} />

      {/* Screen flash */}
      <ScreenFlash trigger={shouldFlash} />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, transparent 30%, rgba(13,8,32,0.8) 100%)",
          opacity: vignetteOpacity,
          transition: "opacity 0.5s ease-out",
          zIndex: 1,
        }}
      />

      {/* Animated grid */}
      <div
        className="game-grid-animate pointer-events-none absolute inset-0"
        style={{
          animation: effectsEnabled ? "grid-drift 8s linear infinite" : "none",
        }}
      />

      {/* Control Panel */}
      <div className="relative z-20 p-4 flex flex-col gap-2">
        <div
          className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30"
          style={{ maxWidth: "300px" }}
        >
          <h2 className="font-mono text-sm font-bold text-purple-300 mb-2">Effects Demo Controls</h2>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => triggerEffect("perfect")}
                className="font-mono text-xs px-3 py-1 rounded border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              >
                PERFECT Hit
              </button>
              <button
                onClick={() => triggerEffect("great")}
                className="font-mono text-xs px-3 py-1 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
              >
                GREAT Hit
              </button>
              <button
                onClick={() => triggerEffect("ok")}
                className="font-mono text-xs px-3 py-1 rounded border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                OK Hit
              </button>
            </div>
            <button
              onClick={() => triggerEffect("milestone")}
              className="font-mono text-xs px-3 py-1 rounded border border-magenta-500/50 bg-magenta-500/10 text-magenta-400 hover:bg-magenta-500/20 transition-colors"
            >
              Milestone Burst
            </button>
          </div>
        </div>
      </div>

      {/* Top bar: Scoreboard + Effects Toggle */}
      <div className="relative z-10 flex items-start justify-end p-4">
        <div className="flex flex-col items-end gap-2">
          <Scoreboard score={state.score} streak={state.streak} lives={state.lives} />
          <EffectsToggle enabled={effectsEnabled} onToggle={() => setEffectsEnabled(!effectsEnabled)} />
        </div>
      </div>

      {/* Center: Target + Feedback */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <TargetWindow
          letter={state.currentNote?.letter ?? null}
          state={state.noteState}
          streak={state.streak}
        />
        <HitFeedback
          text={state.feedbackText}
          streak={state.streak}
          streakMilestone={state.streakMilestone}
          comboMultiplier={state.comboMultiplier}
        />
      </div>

      {/* Bottom: Highway + Lyrics */}
      <div className="relative z-10 flex flex-col gap-2 p-4">
        <NoteHighway notes={state.notes} currentTime={state.currentTime} />
        <LyricsBar word={WORD} currentLetterIndex={adjustedIdx} />
      </div>

      {/* Info */}
      <div className="relative z-20 absolute bottom-4 left-4 font-mono text-xs text-purple-300/60">
        <p>Mock game loop running - effects trigger automatically</p>
        <p>Use control panel to manually trigger effects</p>
      </div>
    </div>
  );
}
