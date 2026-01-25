"use client";

import { useTestingGame } from "~/hooks/useTestingGame";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TestingNoteHighway } from "./TestingNoteHighway";
import { ScreenFlash } from "./ScreenFlash";
import { SuccessBurst } from "./SuccessBurst";
import { FloatingSuccessText } from "./FloatingSuccessText";
import { useSoundEffects } from "~/hooks/useSoundEffects";

interface TestingCanvasProps {
    beatmap: Beatmap;
}

export function TestingCanvas({ beatmap }: TestingCanvasProps) {
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
    // We want to show notes that are within window [-2, +1]
    // In this mode, we mainly focus on one note at a time, but technically multiple could overlap?
    // Use sequential assumption for simplicity or find first unhandled in window.

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
            playSuccessSound(); // Play sound!
            
            const pointsGained = metrics.score - lastMetrics.score;

            let text = `+${pointsGained}`;
            let color = "text-yellow-400"; // Okay

            if (pointsGained >= 95) {
                text = `PERFECT! +${pointsGained}`;
                color = "text-purple-400";
            } else if (pointsGained >= 80) {
                text = `GREAT! +${pointsGained}`;
                color = "text-green-400";
            } else if (pointsGained >= 60) {
                text = `GOOD +${pointsGained}`;
                color = "text-cyan-400";
            }

            setFeedback({ text, color, id: Date.now() });

            // Trigger visual effects
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
            setHitTrigger(prev => prev + 1);
            setSuccessTextTrigger({ text, timestamp: Date.now() });
            setStreak(prev => prev + 1); // Increment streak
        } else if (metrics.misses > lastMetrics.misses) {
            playMissSound(); // Play sound!

            setFeedback({ text: "MISS", color: "text-red-500", id: Date.now() });

            // Trigger negative feedback
            setShowMissFlash(true);
            setTimeout(() => setShowMissFlash(false), 200);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 300);
            setStreak(0); // Reset streak
        }
        setLastMetrics(metrics);
        
        // Ensure audio context is ready on first interaction (if not already)
        if ((metrics.hits > 0 || metrics.misses > 0) && typeof window !== "undefined") {
            initAudio(); 
        }
    }, [metrics, lastMetrics, playSuccessSound, playMissSound, initAudio]);

    return (
        <div className={`relative h-screen w-screen overflow-hidden text-white font-sans ${isShaking ? 'animate-shake' : ''}`}>
            <SynthwaveBackground />

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
            <div className="relative z-10 flex items-start justify-between p-4">
                <WebcamFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isReady={isReady}
                    error={error}
                    isConnected={isConnected}
                    handDetected={handDetected}
                />

                <div className="flex flex-col items-end gap-2 bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className="text-xl font-bold text-white">TESTING MODE</div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        {score} pts
                    </div>
                    <div className="text-sm font-mono text-gray-400">
                        {((elapsed / beatmap.totalDuration) * 100).toFixed(0)}% Complete
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
                            className="flex flex-col items-center"
                        >
                            <div className="text-2xl text-cyan-400 font-bold mb-4">SIGN NOW!</div>
                            <div className="w-64 h-64 bg-black/50 border-4 border-purple-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.4)] relative overflow-hidden">
                                {/* Timer Bar visualization? */}
                                <div className="absolute bottom-0 left-0 h-2 bg-purple-500 w-full animate-[width_3s_linear_forward]" />

                                <span className="text-9xl font-black text-white drop-shadow-lg">
                                    {activeNote.letter}
                                </span>
                            </div>
                        </motion.div>
                    ) : gameState === "playing" ? (
                        <div className="flex flex-col items-center opacity-50">
                            <div className="text-xl text-gray-500 mb-4">Get Ready...</div>
                            <div className="w-48 h-48 border-2 border-dashed border-gray-700 rounded-3xl flex items-center justify-center">
                                {nextNote && (
                                    <span className="text-4xl text-gray-700">{nextNote.letter}</span>
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
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black ${feedback.color} drop-shadow-lg z-50 pointer-events-none`}
                            onAnimationComplete={() => setFeedback(null)}
                        >
                            {feedback.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Screen */}
                {gameState === "idle" && (
                    <div className="flex flex-col items-center z-50">
                        <h1 className="text-6xl font-bold mb-8">TIMED CHALLENGE</h1>
                        <button
                            onClick={startGame}
                            className="px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl rounded-full shadow-lg hover:scale-105 transition-all"
                        >
                            START TEST
                        </button>
                    </div>
                )}
            </div>

            {/* Results Screen */}
            {gameState === "finished" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <h2 className="text-3xl font-bold text-white mb-4">TEST COMPLETE</h2>
                    <div className="text-8xl font-black text-purple-400 mb-8">{score}</div>

                    <div className="grid grid-cols-2 gap-8 text-center mb-12">
                        <div className="flex flex-col">
                            <span className="text-gray-400">PERFECT</span>
                            <span className="text-2xl font-bold text-green-400">{metrics.earlyHits}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400">GOOD</span>
                            <span className="text-2xl font-bold text-yellow-400">{metrics.lateHits}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400">MISS</span>
                            <span className="text-2xl font-bold text-red-400">{metrics.misses}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400">ACCURACY</span>
                            <span className="text-2xl font-bold text-white">
                                {metrics.hits + metrics.misses > 0
                                    ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(0)
                                    : 0}%
                            </span>
                        </div>
                    </div>
                    <a href="/game/songselection" className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full">
                        BACK TO SONGS
                    </a>
                </div>
            )}

        </div>
    );
}
