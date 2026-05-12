"use client";

import { useEffect, useRef, useState } from "react";
import { useWhackAMoleGame } from "~/hooks/useWhackAMoleGame";
import { usePlayerManager } from "~/hooks/usePlayerManager";
import { useAIInteraction } from "~/hooks/useAIInteraction";
import { useWebcam } from "~/hooks/useWebcam";
import { useSignDetection } from "~/hooks/useSignDetection";
import { useSession } from "next-auth/react";
import { WhackAMoleGrid } from "./WhackAMoleGrid";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { api } from "~/trpc/react";
import { useSoundEffects } from "~/hooks/useSoundEffects";
import { FloatingSuccessText } from "./FloatingSuccessText";

interface WhackAMoleCanvasProps {
    onStateChange?: (state: string) => void;
}

export function WhackAMoleCanvas({ onStateChange }: WhackAMoleCanvasProps = {}) {
    const {
        gameState,
        targetLetter,
        score,
        countdown,
        metrics,
        timeLeft,
        availableLetters,
        startGame,
        resetGame,
        handleCorrectHit,
        handleMiss,
    } = useWhackAMoleGame();

    const {
        playerId,
        playerName,
        setPlayerName,
        showNameModal,
        setShowNameModal,
        createPlayerWithName,
        recordMistake,
        submitFinalStats,
        resetFinishFlag,
        isCreating,
    } = usePlayerManager();

    const upsertLeaderboardEntry = api.leaderboard.upsert.useMutation();
    
    // Track if we've already submitted for this game session
    const hasSubmittedLeaderboardRef = useRef(false);

    // Visual & Audio Effects
    const { playSuccessSound, playMissSound, playBackgroundMusic, stopBackgroundMusic, initAudio } = useSoundEffects();
    // Removed global flash/burst state per user request to keep focus on key
    const [successTextTrigger, setSuccessTextTrigger] = useState<{ text: string; timestamp: number } | null>(null);
    const [lastSuccess, setLastSuccess] = useState<string | null>(null);

    // Music control
    useEffect(() => {
        if (gameState === "playing" || gameState === "cooldown" || gameState === "starting") {
            playBackgroundMusic();
        } else {
            stopBackgroundMusic();
        }
        return () => stopBackgroundMusic();
    }, [gameState, playBackgroundMusic, stopBackgroundMusic]);

    const { videoRef, canvasRef, isReady, error, captureFrame } = useWebcam();
    const { predictions, isConnected, handDetected, latency } = useSignDetection(
        captureFrame,
        isReady,
        gameState === "playing"
    );

    const { holdProgress, latestPrediction } = useAIInteraction({
        predictions,
        targetLetter,
        isPlaying: gameState === "playing" && !!playerId,
        isConnected,
        onCorrect: (letter) => {
            playSuccessSound();
            setLastSuccess(letter);
            // Removed global effects
            setSuccessTextTrigger({ text: "NICE!", timestamp: Date.now() });
            handleCorrectHit(letter);
        },
        onMistake: (showed, expected) => {
            // Negative feedback disabled per user request
            // We only care about positive hits
        },
    });

    const { data: session } = useSession();

    useEffect(() => {
        if (onStateChange) onStateChange(gameState);
    }, [gameState, onStateChange]);

    // Submit stats when finished (only once per game)
    useEffect(() => {
        if (gameState === "finished" && playerId && !hasSubmittedLeaderboardRef.current) {
            hasSubmittedLeaderboardRef.current = true;
            
            console.log("🎮 Game finished! Submitting stats...");
            
            // Submit to player stats
            submitFinalStats(score, metrics);
            
            // Upsert leaderboard entry (create or update existing)
            const heroName = session?.user?.name || playerName || "GUEST HERO";
            upsertLeaderboardEntry.mutate({
                name: heroName,
                score: score,
                playerId: playerId, // Pass playerId to ensure unique entries
            }, {
                onSuccess: () => {
                    console.log("✅ Leaderboard entry saved");
                },
                onError: (error) => {
                    console.error("❌ Failed to save leaderboard entry:", error);
                }
            });
        }

        // Reset submission flag when returning to idle
        if (gameState === "idle") {
            resetFinishFlag();
            hasSubmittedLeaderboardRef.current = false;
        }
    }, [gameState, playerId, score, metrics, submitFinalStats, resetFinishFlag, playerName, upsertLeaderboardEntry, session]);

    const handleGridClick = (clickedLetter: string) => {
        if (gameState !== "playing" || !targetLetter || !playerId) return;

        // Initialize audio on interaction
        initAudio();
        
        if (clickedLetter === targetLetter) {
            playSuccessSound();
            setLastSuccess(clickedLetter);
            setSuccessTextTrigger({ text: "NICE!", timestamp: Date.now() });
            handleCorrectHit(clickedLetter);
        }
    };

    const handleStartChallenge = async () => {
        const heroName = session?.user?.name || "GUEST HERO";
        const id = await createPlayerWithName(heroName);
        if (id) {
            startGame();
        } else {
            alert("Failed to initialize game session. Please try again.");
        }
    };

    return (
        <div className={`relative min-h-full w-full overflow-hidden text-white font-sans ${gameState === "idle" ? "bg-transparent" : "bg-[#0a0515]"}`}>
            {gameState !== "idle" && <SynthwaveBackground />}

            {/* Visual Effects */}
            <FloatingSuccessText trigger={successTextTrigger} />

            {gameState !== "idle" && (
                <>
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
                                AVG: {metrics.reactionTimes.length > 0
                                    ? (metrics.reactionTimes.reduce((a, b) => a + b, 0) / metrics.reactionTimes.length).toFixed(0)
                                    : 0}ms
                            </div>
                            <div className="text-xs text-fuchsia-300/60 font-mono">
                                ✓ {metrics.totalCorrect} | ✗ {metrics.totalMisses}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center py-8">
                        <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-md">
                            {gameState === "playing" ? (
                                <span>FIND <span className="text-fuchsia-400 text-5xl mx-2">{targetLetter}</span> !</span>
                            ) : gameState === "cooldown" ? (
                                <span className="text-cyan-400">NEXT ROUND...</span>
                            ) : gameState === "starting" ? (
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
                                onInteract={handleGridClick}
                                holdProgress={holdProgress}
                                recentSuccess={lastSuccess}
                                successCount={metrics.totalCorrect}
                            />
                        </div>
                    </div>

                    {latestPrediction && isConnected && (
                        <div className="absolute bottom-36 left-4 z-20 pointer-events-none">
                            <div className="bg-black/80 backdrop-blur text-white px-4 py-3 rounded-xl border border-white/10 shadow-lg flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono">DETECTED</span>
                                    <span className="text-4xl font-bold text-cyan-400">{latestPrediction.letter}</span>
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

                    {gameState === "starting" && countdown > 0 && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                            <div className="text-[12rem] font-bold text-white drop-shadow-[0_0_50px_rgba(34,211,238,0.8)] animate-pulse">
                                {countdown}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Cinematic Lobby / Start Screen */}
            {gameState === "idle" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-transparent">
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-fuchsia-600/20 blur-[100px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-600/20 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />

                    <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 mb-4 tracking-tighter"
                        style={{ textShadow: "0 0 40px rgba(168, 85, 247, 0.4)" }}>
                        WHACK-A-SIGN
                    </h1>
                    <p className="text-purple-200/80 font-mono mb-12 max-w-md text-center text-sm tracking-widest uppercase">
                        Reflex Lab • AI Sign Speed Test
                    </p>

                    <button
                        onClick={handleStartChallenge}
                        className="relative group px-16 py-6 rounded-3xl overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-500 group-hover:opacity-100 opacity-90 transition-opacity" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        <span className="relative z-10 text-white font-black tracking-[6px] text-xl uppercase">
                            START CHALLENGE
                        </span>
                    </button>
                    
                    <p className="text-xs text-white/40 font-mono mt-6 tracking-widest">
                        SHOW THE SIGN TO THE CAMERA OR CLICK TILES TO SCORE
                    </p>
                </div>
            )}
        </div>
    );
}