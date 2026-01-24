"use client";

import { useRef, useState, useEffect } from "react";
import { useScriptedGameLoop } from "~/hooks/useScriptedGameLoop";
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
import { SynthwaveBackground } from "~/components/game/SynthwaveBackground";

export default function ScriptedDemoPage() {
    const { state, restart } = useScriptedGameLoop(DEMO_BEATMAP);

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

    return (
        <div
            className="game-grid relative flex h-screen w-screen flex-col overflow-hidden"
            style={{ background: bgColor, transition: "background 0.5s ease-out" }}
        >
            {/* Particle overlay */}
            <ParticleOverlay ref={particleOverlayRef} enabled={effectsEnabled} />

            {/* Screen flash */}
            <ScreenFlash trigger={shouldFlash} />

            {/* Synthwave Background */}
            <SynthwaveBackground />

            {/* Control Panel */}
            <div className="relative z-20 p-4 flex flex-col gap-2">
                <div
                    className="bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30"
                    style={{ maxWidth: "300px" }}
                >
                    <h2 className="font-mono text-sm font-bold text-purple-300 mb-2">Scripted Demo Controls</h2>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={restart}
                            className="font-mono text-xs px-3 py-1 rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                        >
                            Restart Script
                        </button>
                        <div className="text-xs text-start text-white/50 space-y-1">
                            <p>Sequence:</p>
                            <ol className="list-decimal pl-4">
                                <li>4x Perfect (Builds)</li>
                                <li>1x Miss (Damage)</li>
                                <li>5x Perfect (Rebuild)</li>
                                <li>5x Great (Milestone)</li>
                            </ol>
                        </div>
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
                <NoteHighway
                    notes={state.notes}
                    currentTime={state.currentTime}
                    activeNoteIndex={state.activeNoteIndex ?? 0}
                />
                <LyricsBar word={WORD} currentLetterIndex={adjustedIdx} />
            </div>

            {/* Info */}
            <div className="relative z-20 absolute bottom-4 left-4 font-mono text-xs text-purple-300/60">
                <p>Running scripted sequence</p>
            </div>
        </div>
    );
}
