"use client";

import { useTrainingGame } from "~/hooks/useTrainingGame";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ScreenFlash } from "./ScreenFlash";
import { SuccessBurst } from "./SuccessBurst";
import { FloatingSuccessText } from "./FloatingSuccessText";
import { useSoundEffects } from "~/hooks/useSoundEffects";

interface TrainingCanvasProps {
    beatmap: Beatmap;
}

function TrainingCanvasContent({ beatmap }: TrainingCanvasProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromUrl = searchParams?.get("from");
    const songId = searchParams?.get("songId");
    const exitUrl = fromUrl ? (songId ? `${fromUrl}?songId=${encodeURIComponent(songId)}` : fromUrl) : "/songselection";

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

    // Sound Effects
    const { playSuccessSound, playMissSound } = useSoundEffects();
    
    // Track previous skipped count
    const lastSkippedCountRef = useRef(0);

    // Trigger visual effects on note completion
    useEffect(() => {
        const successCount = metrics.noteMetrics.filter(m => m.status === "success").length;
        const skippedCount = metrics.noteMetrics.filter(m => m.status === "skipped").length;
        
        // Success Event
        if (successCount > lastSuccessCountRef.current) {
            playSuccessSound();
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
            setHitTrigger(prev => prev + 1);
            setSuccessTextTrigger({ text: "NICE!", timestamp: Date.now() });
        }
        
        // Skipped Event
        if (skippedCount > lastSkippedCountRef.current) {
            playMissSound();
            setSuccessTextTrigger({ text: "SKIPPED", timestamp: Date.now() });
        }
        
        lastSuccessCountRef.current = successCount;
        lastSkippedCountRef.current = skippedCount;
    }, [metrics.noteMetrics, playSuccessSound, playMissSound]);

    return (
        <div className="relative min-h-full w-full overflow-hidden text-white font-sans">
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

            <div className="absolute top-28 right-8 z-40 flex flex-col items-end gap-2 bg-black/40 p-4 rounded-2xl border border-fuchsia-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(192,38,211,0.2)] min-w-[200px]">
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

            {/* Center: Game Area */}
            <div className="relative z-10 flex flex-col items-center justify-center py-8 min-h-[60vh]">
                <AnimatePresence mode="wait">
                    {gameState === "playing" && currentNote && (
                        <motion.div
                            key={currentNote.letter + currentIndex}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="relative flex flex-col items-center top-24"
                        >
                            <div className="text-2xl text-cyan-400 font-bold mb-4 tracking-widest">SIGN THIS:</div>

                            {/* Main Card */}
                            <div className="relative w-64 h-64 glass-panel border-4 border-fuchsia-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(192,38,211,0.4)] overflow-hidden">

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
                    <div className="flex flex-col items-center top-24 relative">
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
                            className="px-12 py-4 glass-button text-white font-bold text-xl rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(192,38,211,0.5)] cursor-pointer tracking-wider"
                        >
                            START TRAINING
                        </button>
                    </div>
                )}
            </div>

            {/* Results Screen */}
            {gameState === "finished" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-20 animate-fade-in">
                    <h2 className="text-2xl font-bold text-cyan-400 tracking-widest mb-2">TRAINING COMPLETE</h2>
                    <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-emerald-500 mb-8 drop-shadow-[0_0_30px_rgba(45,226,230,0.4)]">
                        {(metrics.totalTime / 1000).toFixed(1)}s
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full px-8 mb-12">
                        {metrics.noteMetrics.map((m, i) => (
                            <div key={i} className={`p-4 rounded-2xl backdrop-blur-md border ${m.status === 'skipped' ? 'bg-red-950/40 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-green-950/40 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]'} flex items-center justify-between transition-all hover:scale-[1.02]`}>
                                <span className="text-3xl font-bold text-white">{m.letter}</span>
                                <div className="flex flex-col items-end">
                                    <span className={`font-mono text-xl font-bold ${m.status === 'skipped' ? 'text-red-400' : 'text-green-400'}`}>
                                        {(m.timeSpent / 1000).toFixed(1)}s
                                    </span>
                                    <span className="text-[10px] uppercase font-mono tracking-wider text-white/70">
                                        {m.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-6">
                        <button
                            onClick={restartGame}
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

            {/* Debug Info: Detected Sign */}
            {latestPrediction && (
                <div className="absolute bottom-8 left-8 z-20 pointer-events-none">
                    <div className="glass-panel text-white px-5 py-3 rounded-2xl border border-white/20 shadow-lg flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest font-bold">Detected</span>
                            <span className="text-4xl font-bold text-white">
                                {latestPrediction.letter}
                            </span>
                        </div>
                        <div className="h-10 w-px bg-white/20"></div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-mono">CONF:</span>
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

export function TrainingCanvas(props: TrainingCanvasProps) {
    return (
        <Suspense fallback={<div className="text-cyan-400 py-10 animate-pulse text-center">Loading training simulator...</div>}>
            <TrainingCanvasContent {...props} />
        </Suspense>
    );
}
