"use client";

import { useRouter } from "next/navigation";

import { useWhackAMoleGame } from "~/hooks/useWhackAMoleGame";
import { WhackAMoleGrid } from "./WhackAMoleGrid";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { useWebcam } from "~/hooks/useWebcam";
import { useSignDetection } from "~/hooks/useSignDetection";
import { useEffect, useState, useRef } from "react";
import { FloatingScore } from "./FloatingScore";
import { ScreenFlash } from "./ScreenFlash";
import { FloatingSuccessText } from "./FloatingSuccessText";

const SUCCESS_MESSAGES = ["GREAT!", "PERFECT!", "AMAZING!", "AWESOME!", "NICE!"];

export function WhackAMoleCanvas() {
    const {
        gameState,
        targetLetter,
        score,
        countdown,
        metrics,
        lastHit,
        startGame,
        stopGame,
        handleInteraction,
        availableLetters,
        timeLeft
    } = useWhackAMoleGame();

    const router = useRouter();

    const { videoRef, canvasRef, isReady, error, captureFrame } = useWebcam();

    const { predictions, isConnected, handDetected, latency } = useSignDetection(
        captureFrame,
        isReady,
        true
    );

    const HOLD_DURATION = 1500; // 1.5 seconds
    const [holdProgress, setHoldProgress] = useState(0);
    const holdStartRef = useRef<number | null>(null);

    const latestPrediction = predictions[predictions.length - 1] ?? null;

    // Visual feedback state
    const [showFlash, setShowFlash] = useState(false);
    const [recentSuccessLetter, setRecentSuccessLetter] = useState<string | null>(null);
    const [successTextTrigger, setSuccessTextTrigger] = useState<{ text: string; timestamp: number } | null>(null);
    const prevTotalCorrectRef = useRef(0);
    const prevTargetLetterRef = useRef<string | null>(null);

    // Capture the letter before it changes
    useEffect(() => {
        if (targetLetter) {
            prevTargetLetterRef.current = targetLetter;
        }
    }, [targetLetter]);

    // Trigger visual feedback when score changes
    useEffect(() => {
        if (metrics.totalCorrect > prevTotalCorrectRef.current) {
            setShowFlash(true);
            // Capture the letter that was just matched
            setRecentSuccessLetter(prevTargetLetterRef.current);

            // Determine the success message
            const isStreak = metrics.totalCorrect > 0 && metrics.totalCorrect % 5 === 0;
            const messageText = isStreak
                ? "🔥 ON FIRE! 🔥"
                : SUCCESS_MESSAGES[metrics.totalCorrect % 5] ?? "GREAT!";
            setSuccessTextTrigger({ text: messageText, timestamp: Date.now() });

            // Reset flash after a short delay
            const flashTimer = setTimeout(() => setShowFlash(false), 100);
            // Reset recent success letter after celebrations
            const successTimer = setTimeout(() => setRecentSuccessLetter(null), 1000);
            return () => {
                clearTimeout(flashTimer);
                clearTimeout(successTimer);
            };
        }
        prevTotalCorrectRef.current = metrics.totalCorrect;
    }, [metrics.totalCorrect]);

    // AI Game Logic Loop
    useEffect(() => {
        // Reset if game not playing or no target
        if (gameState !== "playing" || !targetLetter) {
            holdStartRef.current = null;
            setHoldProgress(0);
            return;
        }

        // Check if correct sign is detected
        const isCorrect = latestPrediction &&
            latestPrediction.letter === targetLetter &&
            latestPrediction.confidence >= 0.5;

        if (isCorrect) {
            if (!holdStartRef.current) {
                // Start holding
                holdStartRef.current = Date.now();
            } else {
                // Check duration
                const elapsed = Date.now() - holdStartRef.current;
                const progress = Math.min(elapsed / HOLD_DURATION, 1);
                setHoldProgress(progress);

                if (elapsed >= HOLD_DURATION) {
                    // Success!
                    handleInteraction(targetLetter);
                    holdStartRef.current = null; // Reset
                    setHoldProgress(0);
                }
            }
        } else {
            // Reset if lost or wrong sign
            holdStartRef.current = null;
            setHoldProgress(0);
        }
    }, [gameState, targetLetter, latestPrediction, handleInteraction, predictions /* re-run on every new prediction update */]);

    // Auto-redirect when game finishes
    useEffect(() => {
        if (gameState === "finished") {
            router.push(`/leaderboard?score=${score}`);
        }
    }, [gameState, score, router]);

    return (
        <div className="relative min-h-screen w-screen overflow-hidden text-white font-sans">
            <SynthwaveBackground />

            {/* Success Visual Effects */}
            <FloatingScore trigger={lastHit} />
            <ScreenFlash trigger={showFlash} />
            <FloatingSuccessText trigger={successTextTrigger} />

            {/* Top Bar: Webcam & HUD */}
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
                    <div className={`text-5xl font-bold font-mono ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                        {score} pts
                    </div>
                    <div className="text-sm text-gray-400 font-mono">
                        AVG REACTION: {metrics.reactionTimes.length > 0
                            ? (metrics.reactionTimes.reduce((a, b) => a + b, 0) / metrics.reactionTimes.length).toFixed(0)
                            : 0}ms
                    </div>
                    <div className="text-xs text-fuchsia-300/60 font-mono">
                        {metrics.totalCorrect} Correct
                    </div>
                </div>
            </div>

            {/* Center: Grid */}
            <div className="relative z-10 flex flex-col items-center justify-center py-8">
                <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-md">
                    {gameState === "playing" ? (
                        <span>FIND <span className="text-fuchsia-400 text-5xl mx-2">{targetLetter}</span> !</span>
                    ) : gameState === "cooldown" ? (
                        <span className="text-cyan-400">GET READY...</span>
                    ) : gameState === "finished" ? (
                        "TIME'S UP!"
                    ) : (
                        "TRAINING MODE"
                    )}
                </h1>

                <div className={gameState === "finished" ? "opacity-20 pointer-events-none blur-sm" : ""}>
                    <WhackAMoleGrid
                        availableLetters={availableLetters}
                        targetLetter={targetLetter}
                        onInteract={handleInteraction}
                        holdProgress={holdProgress}
                        recentSuccess={recentSuccessLetter}
                        successCount={metrics.totalCorrect}
                    />
                </div>
            </div>

            {/* Debug Info: Detected Sign - Bottom Left */}
            {latestPrediction && (
                <div className="absolute bottom-36 left-4 z-20 pointer-events-none">
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
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-mono">LAT:</span>
                                <span className="text-[10px] text-gray-400 font-mono">{latency.toFixed(0)}ms</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlays */}
            {gameState === "idle" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8">
                        WHACK-A-SIGN
                    </h1>
                    <p className="text-gray-300 mb-12 max-w-md text-center text-lg">
                        Test your sign recognition speed!
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">
                            (Use the AI Camera OR Click the tiles to play)
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



            {/* Countdown Overlay */}
            {gameState === "cooldown" && countdown > 0 && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="text-[12rem] font-bold text-white drop-shadow-[0_0_50px_rgba(34,211,238,0.8)] animate-pulse">
                        {countdown}
                    </div>
                </div>
            )}

        </div>
    );
}
