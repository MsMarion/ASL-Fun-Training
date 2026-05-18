"use client";

import { useTestingGame } from "~/hooks/useTestingGame";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TestingNoteHighway } from "./TestingNoteHighway";
import { ScreenFlash } from "./ScreenFlash";
import { SuccessBurst } from "./SuccessBurst";
import { FloatingSuccessText } from "./FloatingSuccessText";
import { useSoundEffects } from "~/hooks/useSoundEffects";

interface TestingCanvasProps {
    beatmap: Beatmap;
}

function TestingCanvasContent({ beatmap }: TestingCanvasProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromUrl = searchParams?.get("from");
    const songId = searchParams?.get("songId");
    const exitUrl = fromUrl ? (songId ? `${fromUrl}?songId=${encodeURIComponent(songId)}` : fromUrl) : "/songselection";

    const {
        gameState,
        score,
        metrics,
        elapsed,
        startGame,
        videoRef,
        canvasRef,
        isReady,
        error,
        isConnected,
        handDetected,
        latestPrediction,
        processedNotes
    } = useTestingGame(beatmap);

    // Find active note to display
    const activeNoteIndex = beatmap.notes.findIndex((note, i) => {
        if (processedNotes.has(i)) return false;
        const windowStart = note.time - 2.0;
        const windowEnd = note.time + 1.0;
        return elapsed >= windowStart && elapsed <= windowEnd;
    });

    const activeNote = activeNoteIndex !== -1 ? beatmap.notes[activeNoteIndex] : null;
    const nextNote = beatmap.notes.find((n, i) => !processedNotes.has(i) && n.time - 2.0 > elapsed);

    // Feedback State
    const [feedback, setFeedback] = useState<{ text: string, color: string, id: number } | null>(null);
    const [lastMetrics, setLastMetrics] = useState(metrics);

    // Visual Effects State
    const [showFlash, setShowFlash] = useState(false);
    const [hitTrigger, setHitTrigger] = useState(0);
    const [successTextTrigger, setSuccessTextTrigger] = useState<{ text: string; timestamp: number } | null>(null);

    // Negative Feedback State
    const [showMissFlash, setShowMissFlash] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // Streak Tracking
    const [streak, setStreak] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);

    // Background SVG State
    const [bgSvg, setBgSvg] = useState<{ pathData: string, viewBox: string, transform: string } | null>(null);

    useEffect(() => {
        if (activeNote?.letter) {
            import("~/lib/svgLoader").then(async ({ loadSignSvg }) => {
                try {
                    const data = await loadSignSvg(activeNote.letter);
                    setBgSvg(data);
                } catch (e) {
                    console.error("Failed to load SVG", e);
                    setBgSvg(null);
                }
            });
        } else {
            setBgSvg(null);
        }
    }, [activeNote?.letter]);

    // Sound Effects
    const { playSuccessSound, playMissSound, initAudio } = useSoundEffects();

    useEffect(() => {
        // detect changes in metrics for feedback
        if (metrics.hits > lastMetrics.hits) {
            playSuccessSound();
            
            const pointsGained = metrics.score - lastMetrics.score;
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxCombo(prev => Math.max(prev, newStreak));

            let text = `+${pointsGained}`;
            let color = "text-yellow-400";

            // Streak Feedback
            if (newStreak >= 3) {
                if (newStreak % 10 === 0) {
                     text = `${newStreak} COMBO!`;
                     color = "text-fuchsia-400 text-8xl"; // Big pop
                } else if (newStreak % 5 === 0) {
                     text = "UNSTOPPABLE!";
                     color = "text-green-400";
                } else if (newStreak === 3) {
                     text = "HEATING UP!";
                     color = "text-orange-400";
                }
            }
            
            // Standard feedback override if points are high but streak event didn't trigger special text
            if (pointsGained >= 95 && !text.includes("COMBO") && !text.includes("STOP") && !text.includes("HEAT")) {
                text = `PERFECT! +${pointsGained}`;
                color = "text-purple-400";
            }

            setFeedback({ text, color, id: Date.now() });

            // Trigger visual effects
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
            setHitTrigger(prev => prev + 1);
            setSuccessTextTrigger({ text, timestamp: Date.now() });
        } else if (metrics.misses > lastMetrics.misses) {
            playMissSound();

            setFeedback({ text: "MISS", color: "text-red-500", id: Date.now() });
            
            // Trigger negative feedback
            setShowMissFlash(true);
            setTimeout(() => setShowMissFlash(false), 200);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 300);
            setStreak(0); // Reset streak
        }
        setLastMetrics(metrics);
        
        // Ensure audio context is ready on first interaction
        if ((metrics.hits > 0 || metrics.misses > 0) && typeof window !== "undefined") {
            initAudio(); 
        }
    }, [metrics, lastMetrics, playSuccessSound, playMissSound, initAudio, streak]);

    return (
        <div className={`relative h-full w-full overflow-hidden text-white font-sans ${isShaking ? 'animate-shake' : ''}`}>
            {/* Visual Effects */}
            <ScreenFlash trigger={showFlash} />
            <SuccessBurst trigger={hitTrigger} />
            <FloatingSuccessText trigger={successTextTrigger} />

            {/* Negative Feedback: Red Miss Flash */}
            {showMissFlash && (
                <div
                    className="pointer-events-none absolute inset-0 z-30"
                    style={{
                        background: "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)",
                        animation: "miss-flash 0.2s ease-out forwards",
                    }}
                />
            )}

            {/* Background SVG Diagram */}
            <AnimatePresence mode="wait">
                {gameState === "playing" && bgSvg && activeNote && (
                    <motion.div
                        key={activeNote.letter}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.15, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-[15%] left-[5%] w-[50vh] h-[50vh] pointer-events-none z-0 opacity-15"
                    >
                        <svg
                            viewBox={bgSvg.viewBox}
                            className="w-[80vh] h-[80vh] fill-white stroke-fuchsia-400 stroke-2"
                        >
                            <g transform={bgSvg.transform}>
                                <path d={bgSvg.pathData} />
                            </g>
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Bar: Webcam & Stats */}
            <div className="absolute top-28 left-8 z-40">
                <WebcamFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isReady={isReady}
                    error={error}
                    isConnected={isConnected}
                    handDetected={handDetected}
                />
            </div>

            <div className="absolute top-28 right-8 z-40 flex flex-col items-end gap-2 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] min-w-[200px]">
                <div className="text-xl font-bold text-white mb-2 tracking-widest font-mono">TESTING MODE</div>
                
                {/* Score */}
                <div className="flex flex-col items-end mb-2">
                    <span className="text-xs text-fuchsia-300 font-mono tracking-widest font-bold">SCORE</span>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                        {score.toLocaleString()}
                    </div>
                </div>

                {/* Completion */}
                <div className="flex flex-col items-end mb-2 w-full">
                    <span className="text-xs text-fuchsia-300 font-mono tracking-widest font-bold">PROGRESS</span>
                    <div className="text-lg font-mono text-white font-bold">
                        {((elapsed / beatmap.totalDuration) * 100).toFixed(0)}%
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-1 border border-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${Math.min(100, (elapsed / beatmap.totalDuration) * 100)}%` }} />
                    </div>
                </div>

                {/* Enhanced Stats: Remaining & Max Combo */}
                <div className="grid grid-cols-2 gap-4 w-full mt-2 pt-2 border-t border-white/10">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">REMAINING</span>
                        <span className="text-lg font-bold text-cyan-400 font-mono">
                            {Math.max(0, beatmap.notes.length - (metrics.hits + metrics.misses))}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">MAX COMBO</span>
                        <span className="text-lg font-bold text-yellow-400 font-mono">
                            {maxCombo}
                        </span>
                    </div>
                </div>
            </div>

            {/* Center Game Area */}
            <div className="relative z-10 flex flex-col items-center justify-center py-8 min-h-[60vh]">
                {/* Active Note Card */}
                <AnimatePresence mode="popLayout">
                    {gameState === "playing" && activeNote ? (
                        <motion.div
                            key={activeNoteIndex}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            className="flex flex-col items-center top-24 relative"
                        >
                            <div className="text-2xl text-cyan-400 font-bold mb-4 tracking-widest">SIGN NOW!</div>
                            <div className="w-64 h-64 glass-panel border-4 border-purple-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.4)] relative overflow-hidden">
                                {/* Timer Bar visualization */}
                                <div className="absolute bottom-0 left-0 h-2 bg-purple-500 w-full animate-[width_3s_linear_forward]" />

                                <span className="text-9xl font-black text-white drop-shadow-lg">
                                    {activeNote.letter}
                                </span>
                            </div>
                        </motion.div>
                    ) : gameState === "playing" ? (
                        <div className="flex flex-col items-center opacity-50 top-24 relative">
                            <div className="text-xl text-gray-500 mb-4 tracking-widest font-mono font-bold">Get Ready...</div>
                            <div className="w-48 h-48 border-2 border-dashed border-gray-700 rounded-3xl flex items-center justify-center">
                                {nextNote && (
                                    <span className="text-4xl text-gray-700 font-bold">{nextNote.letter}</span>
                                )}
                            </div>
                        </div>
                    ) : null}
                </AnimatePresence>

                {/* New Highway (Right) */}
                {gameState === "playing" && (
                    <TestingNoteHighway notes={beatmap.notes} elapsed={elapsed} streak={streak} />
                )}

                {/* Feedback Popups */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            key={feedback.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black ${feedback.color} drop-shadow-lg z-50 pointer-events-none whitespace-nowrap`}
                            onAnimationComplete={() => setFeedback(null)}
                        >
                            {feedback.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Screen */}
                {gameState === "idle" && (
                    <div className="flex flex-col items-center z-50 top-24 relative">
                        <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-500 drop-shadow-[0_0_30px_rgba(217,70,239,0.3)]">TIMED CHALLENGE</h1>
                        <button
                            onClick={startGame}
                            className="px-12 py-4 glass-button text-white font-bold text-xl rounded-full shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105 transition-all cursor-pointer tracking-wider"
                        >
                            START TEST
                        </button>
                    </div>
                )}
            </div>

            {/* Results Screen */}
            {gameState === "finished" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-20 animate-fade-in">
                    <h2 className="text-2xl font-bold text-purple-400 tracking-widest mb-2 font-mono">TESTING COMPLETE</h2>
                    <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-8 drop-shadow-[0_0_30px_rgba(236,72,153,0.4)]">
                        {score.toLocaleString()} PTS
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-8 mb-12">
                        <div className="backdrop-blur-md bg-green-950/30 p-6 flex flex-col items-center rounded-2xl border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all hover:scale-[1.02]">
                            <span className="text-sm font-mono tracking-wider font-bold text-gray-400 mb-1">CORRECT HITS</span>
                            <span className="text-5xl font-black text-green-400">{metrics.hits}</span>
                        </div>
                        <div className="backdrop-blur-md bg-yellow-950/30 p-6 flex flex-col items-center rounded-2xl border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all hover:scale-[1.02]">
                            <span className="text-sm font-mono tracking-wider font-bold text-gray-400 mb-1">MAX COMBO</span>
                            <span className="text-5xl font-black text-yellow-400">{maxCombo}</span>
                        </div>
                        <div className="backdrop-blur-md bg-red-950/30 p-6 flex flex-col items-center rounded-2xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all hover:scale-[1.02]">
                            <span className="text-sm font-mono tracking-wider font-bold text-gray-400 mb-1">MISSED SIGNS</span>
                            <span className="text-5xl font-black text-red-400">{metrics.misses}</span>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <button
                            onClick={startGame}
                            className="px-10 py-4 glass-button text-white font-bold text-xl rounded-full transition-all hover:scale-105 cursor-pointer tracking-wider"
                        >
                            RETRY
                        </button>
                        <button
                            onClick={() => router.push(exitUrl)}
                            className="px-10 py-4 glass-button text-white font-bold text-xl rounded-full transition-all hover:scale-105 cursor-pointer tracking-wider"
                        >
                            EXIT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function TestingCanvas(props: TestingCanvasProps) {
    return (
        <Suspense fallback={<div className="text-purple-400 py-10 animate-pulse text-center">Loading testing arena...</div>}>
            <TestingCanvasContent {...props} />
        </Suspense>
    );
}
