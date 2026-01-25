"use client";

import { useTrainingGame } from "~/hooks/useTrainingGame";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { useEffect, useState, useRef } from "react";
import { AVAILABLE_LETTERS } from "~/lib/svgLoader";
import { AnimatePresence, motion } from "framer-motion";
import { ScreenFlash } from "./ScreenFlash";
import { SuccessBurst } from "./SuccessBurst";
import { FloatingSuccessText } from "./FloatingSuccessText";

interface TrainingCanvasProps {
    beatmap: Beatmap;
}

export function TrainingCanvas({ beatmap }: TrainingCanvasProps) {
    // TOGGLE: Set to true to enable "Instant Mode" (no hold required)
    const IS_INSTANT_MODE = true;

    const {
        gameState,
        currentNote,
        currentIndex,
        totalNotes,
        metrics,
        holdProgress,
        startGame,
        restartGame,
        videoRef,
        canvasRef,
        isReady,
        error,
        isConnected,
        handDetected,
        latestPrediction,
        latency
    } = useTrainingGame(beatmap, IS_INSTANT_MODE);

    // ... rest of hook usage ...

    // For visual countdown/progress bar on the current note
    const [visualProgress, setVisualProgress] = useState(0);

    useEffect(() => {
        if (gameState === "playing") {
            const interval = setInterval(() => {
                setVisualProgress(p => Math.min(p + (100 / 1000) * (100 / 10), 100)); // 10s progress
            }, 100);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    // Reset progress when note changes
    useEffect(() => {
        setVisualProgress(0);
    }, [currentIndex]);

    // Load SVG for current letter
    const [bgSvg, setBgSvg] = useState<{ pathData: string, viewBox: string, transform: string } | null>(null);

    // Visual Effects State
    const [showFlash, setShowFlash] = useState(false);
    const [hitTrigger, setHitTrigger] = useState(0);
    const [successTextTrigger, setSuccessTextTrigger] = useState<{ text: string; timestamp: number } | null>(null);
    const lastSuccessCountRef = useRef(0);

    useEffect(() => {
        if (currentNote?.letter) {
            import("~/lib/svgLoader").then(async ({ loadSignSvg }) => {
                try {
                    const data = await loadSignSvg(currentNote.letter);
                    setBgSvg(data);
                } catch (e) {
                    console.error("Failed to load SVG", e);
                    setBgSvg(null);
                }
            });
        } else {
            setBgSvg(null);
        }
    }, [currentNote?.letter]);

    // Trigger visual effects on successful note completion
    useEffect(() => {
        const successCount = metrics.noteMetrics.filter(m => m.status === "success").length;
        if (successCount > lastSuccessCountRef.current) {
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
            setHitTrigger(prev => prev + 1);
            setSuccessTextTrigger({ text: "NICE!", timestamp: Date.now() });
        }
        lastSuccessCountRef.current = successCount;
    }, [metrics.noteMetrics]);

    return (
        <div className="relative min-h-screen w-screen overflow-hidden text-white font-sans">
            <SynthwaveBackground />

            {/* Visual Effects */}
            <ScreenFlash trigger={showFlash} />
            <SuccessBurst trigger={hitTrigger} />
            <FloatingSuccessText trigger={successTextTrigger} />

            {/* Background SVG Diagram */}
            <AnimatePresence mode="wait">
                {gameState === "playing" && bgSvg && (
                    <motion.div
                        key={currentNote?.letter}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.15, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
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

            {/* Top Bar: Webcam & Stats & Filters */}
            <div className="relative z-10 flex items-start justify-between p-4">
                <WebcamFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isReady={isReady}
                    error={error}
                    isConnected={isConnected}
                    handDetected={handDetected}
                />

                {/* Settings Toggle Removed (Code-only now) */}

                <div className="flex flex-col items-end gap-2 bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className="text-xl font-bold text-white">
                        TRAINING MODE
                    </div>
                    <div className="text-fuchsia-400 font-mono text-lg">
                        {beatmap.title}
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                        {currentIndex} / {totalNotes}
                    </div>
                </div>
            </div>

            {/* Center: Game Area */}
            <div className="relative z-10 flex flex-col items-center justify-center py-8 min-h-[60vh]">
                <AnimatePresence mode="wait">
                    {gameState === "playing" && currentNote && (
                        <motion.div
                            key={currentNote.letter + currentIndex}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="relative flex flex-col items-center"
                        >
                            <div className="text-2xl text-cyan-400 font-bold mb-4 tracking-widest">SIGN THIS:</div>

                            {/* Main Card */}
                            <div className="relative w-64 h-64 bg-black/50 border-4 border-fuchsia-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(192,38,211,0.4)] overflow-hidden">

                                {/* Green Background Fill (Rising from bottom) */}
                                {holdProgress > 0 && (
                                    <div
                                        className="absolute inset-x-0 bottom-0 bg-green-500/50 z-0 transition-all duration-75 linear"
                                        style={{ height: `${holdProgress * 100}%` }}
                                    />
                                )}

                                {/* Skip Timer (Cyan Ring) - Only show when not holding */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible z-10" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))' }}>
                                    {holdProgress === 0 && (
                                        <rect
                                            x="4" y="4" width="calc(100% - 8px)" height="calc(100% - 8px)"
                                            className="stroke-cyan-400 fill-none"
                                            strokeWidth="12"
                                            rx="20"
                                            strokeDasharray="1000"
                                            strokeDashoffset={1000 - (visualProgress / 100) * 1000}
                                            pathLength="1000"
                                        />
                                    )}
                                </svg>

                                {/* Base White Letter */}
                                <span className="text-9xl font-black text-white drop-shadow-lg z-20">
                                    {currentNote.letter}
                                </span>
                            </div>

                            {/* Hint text */}
                            <div className="mt-8 text-white/50 h-8">
                                {holdProgress > 0 ? (
                                    <span className="text-green-400 font-bold animate-pulse">HOLD IT...</span>
                                ) : (
                                    <span className="animate-pulse">Waiting for hand...</span>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Screen */}
                {gameState === "idle" && (
                    <div className="flex flex-col items-center">
                        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8">
                            {beatmap.title}
                        </h1>
                        <p className="text-gray-300 mb-12 text-center text-lg max-w-lg">
                            Practice the signs for this song at your own pace.
                            <br />
                            <span className="text-sm text-gray-500 mt-2 block">
                                If you get stuck, we'll skip to the next sign after 10 seconds.
                            </span>
                        </p>
                        <button
                            onClick={startGame}
                            className="px-12 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xl rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(192,38,211,0.5)]"
                        >
                            START TRAINING
                        </button>
                    </div>
                )}
            </div>

            {/* Results Screen */}
            {gameState === "finished" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-20">
                    <h2 className="text-2xl font-bold text-white mb-2">TRAINING COMPLETE</h2>
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-8">
                        {(metrics.totalTime / 1000).toFixed(1)}s
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full px-8 mb-12">
                        {metrics.noteMetrics.map((m, i) => (
                            <div key={i} className={`p-4 rounded-lg border ${m.status === 'skipped' ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'} flex items-center justify-between`}>
                                <span className="text-2xl font-bold text-white">{m.letter}</span>
                                <div className="flex flex-col items-end">
                                    <span className={`font-mono text-lg ${m.status === 'skipped' ? 'text-red-400' : 'text-green-400'}`}>
                                        {(m.timeSpent / 1000).toFixed(1)}s
                                    </span>
                                    <span className="text-[10px] uppercase text-white/50">
                                        {m.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={restartGame}
                            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded-full transition-all hover:scale-105"
                        >
                            RETRY
                        </button>
                        <a
                            href="/game/songselection"
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-full transition-all hover:scale-105"
                        >
                            EXIT
                        </a>
                    </div>
                </div>
            )}

            {/* Debug Info: Detected Sign */}
            {latestPrediction && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/10 shadow-lg flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Detected</span>
                            <span className="text-4xl font-bold text-cyan-400">
                                {latestPrediction.letter}
                            </span>
                        </div>
                        <div className="h-10 w-px bg-white/20"></div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-mono">CONF:</span>
                                <span className={`text-sm font-bold font-mono ${latestPrediction.confidence > 0.8 ? "text-green-400" : latestPrediction.confidence > 0.5 ? "text-yellow-400" : "text-red-400"}`}>
                                    {(latestPrediction.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
