"use client";

import { useEffect, useRef } from "react";
import { useWhackAMoleGame } from "~/hooks/useWhackAMoleGame";
import { usePlayerManager } from "~/hooks/usePlayerManager";
import { useAIInteraction } from "~/hooks/useAIInteraction";
import { useWebcam } from "~/hooks/useWebcam";
import { useSignDetection } from "~/hooks/useSignDetection";
import { WhackAMoleGrid } from "./WhackAMoleGrid";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
<<<<<<< HEAD
import { api } from "~/trpc/react";
=======
import { useWebcam } from "~/hooks/useWebcam";
import { useSignDetection } from "~/hooks/useSignDetection";
import { useEffect, useState, useRef } from "react";
import { FloatingScore } from "./FloatingScore";
import { ScreenFlash } from "./ScreenFlash";
import { FloatingSuccessText } from "./FloatingSuccessText";
import { useSoundEffects } from "~/hooks/useSoundEffects";

const SUCCESS_MESSAGES = ["GREAT!", "PERFECT!", "AMAZING!", "AWESOME!", "NICE!"];
>>>>>>> origin/main

export function WhackAMoleCanvas() {
    const {
        gameState,
        targetLetter,
        score,
        countdown,
        metrics,
<<<<<<< HEAD
        timeLeft,
=======
        lastHit,
        startGame,
        stopGame,
        handleInteraction,
>>>>>>> origin/main
        availableLetters,
        startGame,
        resetGame,
        handleCorrectHit,
        handleMiss,
    } = useWhackAMoleGame();

    const {
<<<<<<< HEAD
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
=======
        playSuccessSound,
        playStreakSound,
        playBackgroundMusic,
        stopBackgroundMusic,
        initAudio
    } = useSoundEffects();

    const [isMuted, setIsMuted] = useState(false);
    const backgroundMusicStartedRef = useRef(false);

    const router = useRouter();
>>>>>>> origin/main

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
        onCorrect: handleCorrectHit,
        onMistake: (showed, expected) => {
            recordMistake(showed, expected);
            handleMiss();
        },
    });

<<<<<<< HEAD
    // Show name modal on idle
=======
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

            // Play sound
            if (isStreak) {
                playStreakSound();
            } else {
                playSuccessSound();
            }

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
>>>>>>> origin/main
    useEffect(() => {
        if (gameState === "idle" && !playerId && !showNameModal) {
            setShowNameModal(true);
        }
    }, [gameState, playerId, showNameModal, setShowNameModal]);

    // Submit stats when finished (only once per game)
    useEffect(() => {
        if (gameState === "finished" && playerId && !hasSubmittedLeaderboardRef.current) {
            hasSubmittedLeaderboardRef.current = true;
            
            console.log("🎮 Game finished! Submitting stats...");
            
            // Submit to player stats
            submitFinalStats(score, metrics);
            
            // Upsert leaderboard entry (create or update existing)
            upsertLeaderboardEntry.mutate({
                name: playerName,
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

<<<<<<< HEAD
        // Reset submission flag when returning to idle
        if (gameState === "idle") {
            resetFinishFlag();
            hasSubmittedLeaderboardRef.current = false;
        }
    }, [gameState, playerId, score, metrics, submitFinalStats, resetFinishFlag, playerName, upsertLeaderboardEntry]);

    const handleGridClick = (clickedLetter: string) => {
        if (gameState !== "playing" || !targetLetter || !playerId) return;

        if (clickedLetter === targetLetter) {
            handleCorrectHit(clickedLetter);
        } else {
            recordMistake(clickedLetter, targetLetter);
            handleMiss();
        }
    };

    const handleCreatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = await createPlayerWithName(playerName);
        if (id) {
            setShowNameModal(false);
            startGame();
        } else {
            alert("Failed to create player. Please try again.");
        }
    };
=======
    // Auto-redirect when game finishes and stop music
    useEffect(() => {
        if (gameState === "finished") {
            stopBackgroundMusic();
            router.push(`/leaderboard?score=${score}`);
        }
    }, [gameState, score, router, stopBackgroundMusic]);

    // Handle music mute toggle
    useEffect(() => {
        if (isMuted) {
            stopBackgroundMusic();
            backgroundMusicStartedRef.current = false;
        } else if (gameState === "playing" && !backgroundMusicStartedRef.current) {
            playBackgroundMusic();
            backgroundMusicStartedRef.current = true;
        }
    }, [isMuted, gameState, playBackgroundMusic, stopBackgroundMusic]);

    // Cleanup music on unmount
    useEffect(() => {
        return () => {
            stopBackgroundMusic();
        };
    }, [stopBackgroundMusic]);
>>>>>>> origin/main

    return (
        <div className="relative min-h-screen w-screen overflow-hidden text-white font-sans">
            <SynthwaveBackground />

<<<<<<< HEAD
            {showNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                    <div className="relative rounded-2xl p-1 bg-gradient-to-b from-cyan-500/50 via-fuchsia-500/30 to-purple-500/50">
                        <div className="rounded-xl bg-[#1a0a2e] p-6 md:p-8 max-w-md w-full mx-4">
                            <h2 className="text-xl md:text-2xl font-bold text-fuchsia-400 mb-4 text-center"
                                style={{ textShadow: '0 0 10px #d946ef, 0 0 20px #d946ef' }}>
                                ENTER YOUR NAME
                            </h2>
                            <p className="text-sm text-gray-400 text-center mb-4">
                                Your stats will be tracked and saved
                            </p>
                            <form onSubmit={handleCreatePlayer}>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                                    maxLength={20}
                                    className="w-full px-4 py-3 bg-[#0d0221] border-2 border-fuchsia-500/50 rounded-lg text-cyan-400 font-mono text-lg focus:outline-none focus:border-cyan-400 uppercase"
                                    placeholder="YOUR NAME"
                                    autoFocus
                                    disabled={isCreating}
                                />
                                <button
                                    type="submit"
                                    disabled={!playerName.trim() || isCreating}
                                    className="w-full mt-6 px-4 py-3 rounded-lg font-mono text-[#0d0221] bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? 'CREATING...' : 'START GAME'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

=======
            {/* Success Visual Effects */}
            <FloatingScore trigger={lastHit} />
            <ScreenFlash trigger={showFlash} />
            <FloatingSuccessText trigger={successTextTrigger} />

            {/* Top Bar: Webcam & HUD */}
>>>>>>> origin/main
            <div className="relative z-10 flex items-start justify-between p-4">
                {/* Score & Controls */}
                <div className="flex flex-col gap-4">
                    <WebcamFeed
                        videoRef={videoRef}
                        canvasRef={canvasRef}
                        isReady={isReady}
                        error={error}
                        isConnected={isConnected}
                        handDetected={handDetected}
                    />

                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="bg-black/40 hover:bg-black/60 backdrop-blur text-white/80 p-2 rounded-lg border border-white/10 transition-colors flex items-center gap-2 w-fit"
                    >
                        <span>{isMuted ? "🔇" : "🔊"}</span>
                        <span className="text-sm font-bold">{isMuted ? "UNMUTE MUSIC" : "MUTE MUSIC"}</span>
                    </button>
                </div>

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
                        recentSuccess={recentSuccessLetter}
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

<<<<<<< HEAD
            {gameState === "cooldown" && countdown > 0 && playerId && (
=======
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
                        onClick={() => {
                            initAudio();
                            if (!isMuted) {
                                playBackgroundMusic();
                                backgroundMusicStartedRef.current = true;
                            }
                            startGame();
                        }}
                        className="px-12 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xl rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(192,38,211,0.5)]"
                    >
                        START TRAINING
                    </button>
                </div>
            )}



            {/* Countdown Overlay */}
            {gameState === "cooldown" && countdown > 0 && (
>>>>>>> origin/main
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="text-[12rem] font-bold text-white drop-shadow-[0_0_50px_rgba(34,211,238,0.8)] animate-pulse">
                        {countdown}
                    </div>
                </div>
            )}

            {gameState === "idle" && !showNameModal && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                    <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8">
                        WHACK-A-SIGN
                    </h1>
                    <p className="text-gray-300 mb-12 max-w-md text-center text-lg">
                        Test your sign recognition speed!
                        <br />
                        <span className="text-sm text-gray-500 mt-2 block">
                            (Use AI Camera or Click tiles)
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}