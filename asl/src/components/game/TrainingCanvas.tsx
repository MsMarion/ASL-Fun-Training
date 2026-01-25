"use client";

import { useTrainingGame } from "~/hooks/useTrainingGame";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NameEntryModal } from "./NameEntryModal";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

interface TrainingCanvasProps {
  beatmap: Beatmap;
  category: string;
}

export function TrainingCanvas({ beatmap, category }: TrainingCanvasProps) {
  const router = useRouter();
  
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

  // Player state
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [showNameModal, setShowNameModal] = useState(true);
  const [hasSubmittedStats, setHasSubmittedStats] = useState(false);

  // API mutations
  const createPlayer = api.player.create.useMutation();
  const addMistake = api.player.addMistake.useMutation();
  const updateFinalStats = api.player.updateFinalStats.useMutation();
  const upsertLeaderboard = api.leaderboard.upsert.useMutation();

  // Mistake tracking - deduplicate mistakes
  const [lastMistakeKey, setLastMistakeKey] = useState<string>("");
  
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

  // Track mistakes using AI predictions
  useEffect(() => {
    if (!playerId || !currentNote || !latestPrediction || !isConnected || gameState !== "playing") {
      return;
    }

    const targetLetter = currentNote.letter;
    const predictedLetter = latestPrediction.letter;
    const confidence = latestPrediction.confidence;

    // If prediction is confident but wrong, track as mistake
    if (predictedLetter !== targetLetter && confidence >= 0.5) {
      const mistakeKey = `${predictedLetter}->${targetLetter}`;
      
      // Only track each unique mistake once per note to avoid spam
      if (mistakeKey !== lastMistakeKey) {
        setLastMistakeKey(mistakeKey);
        
        console.log(`❌ Mistake detected: Showed ${predictedLetter}, Expected ${targetLetter}`);
        
        addMistake.mutate({
          playerId: playerId,
          key1: predictedLetter, // What they showed
          key2: targetLetter,    // What was expected
        }, {
          onSuccess: () => {
            console.log(`✅ Mistake recorded: ${mistakeKey}`);
          },
          onError: (error) => {
            console.error("Failed to record mistake:", error);
          }
        });
      }
    }
  }, [playerId, currentNote, latestPrediction, isConnected, gameState, lastMistakeKey, addMistake]);

  // Reset mistake key when current note changes
  useEffect(() => {
    setLastMistakeKey("");
  }, [currentNote?.letter]);

  // Handle name submission
  const handleNameSubmit = async (name: string) => {
    try {
      const player = await createPlayer.mutateAsync({
        name: name,
        score: 0,
        avgReactionTime: 0,
        mistakesMade: 0,
        correctHits: 0,
        category: category,
      });

      setPlayerId(player.id);
      setPlayerName(name);
      setShowNameModal(false);
    } catch (error) {
      console.error("Failed to create player:", error);
      alert("Failed to create player. Please try again.");
    }
  };

  const handleCancel = () => {
    router.push('/songselection');
  };

  // Submit stats when game finishes
  useEffect(() => {
    if (!playerId || hasSubmittedStats || gameState !== "finished") return;

    setHasSubmittedStats(true);

    // Calculate metrics from training results
    const completedNotes = metrics.noteMetrics.filter(m => m.status === 'success').length;
    const skippedNotes = metrics.noteMetrics.filter(m => m.status === 'skipped').length;
    const avgTime = metrics.noteMetrics.length > 0
      ? Math.round(metrics.noteMetrics.reduce((sum, m) => sum + m.timeSpent, 0) / metrics.noteMetrics.length)
      : 0;

    // Calculate score: 100 points per successful note, -50 for skipped
    const score = (completedNotes * 100) - (skippedNotes * 50);

    updateFinalStats.mutate({
      playerId,
      score: Math.max(0, score), // Don't allow negative scores
      avgReactionTime: avgTime,
      mistakesMade: skippedNotes,
      correctHits: completedNotes,
    });

    upsertLeaderboard.mutate({
      name: playerName,
      score: Math.max(0, score),
      playerId: playerId,
      category: category,
    }, {
      onSuccess: () => {
        console.log("✅ Training stats saved to leaderboard");
        // Redirect to leaderboard after a short delay
        setTimeout(() => {
          router.push(`/leaderboard?playerId=${playerId}&category=${category}`);
        }, 2000);
      },
      onError: (error) => {
        console.error("❌ Failed to save to leaderboard:", error);
      }
    });
  }, [gameState, playerId, hasSubmittedStats, metrics, playerName, category, router, updateFinalStats, upsertLeaderboard]);

  return (
    <div className="relative min-h-screen w-screen overflow-hidden text-white font-sans">
      <NameEntryModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        onCancel={handleCancel}
        isLoading={createPlayer.isPending}
      />

      <SynthwaveBackground />

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
            <div className="text-sm font-mono text-cyan-400">
              {playerName ? `PLAYER: ${playerName}` : "TRAINING"}
            </div>
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
                         <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible z-10">
                            {holdProgress === 0 && (
                                <rect 
                                    x="0" y="0" width="100%" height="100%" 
                                    className="stroke-cyan-500/30 fill-none"
                                    strokeWidth="8"
                                    rx="24"
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
         {gameState === "idle" && !showNameModal && (
            <div className="flex flex-col items-center">
                 <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8">
                    {beatmap.title}
                </h1>
                <p className="text-gray-300 mb-12 text-center text-lg max-w-lg">
                    Practice the signs for this song at your own pace.
                    <br/>
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

       {/* Results Screen with redirect message */}
       {gameState === "finished" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-20">
            <div className="text-sm font-mono text-cyan-400 mb-2">PLAYER: {playerName}</div>
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

            <div className="text-cyan-400 font-mono animate-pulse mb-4">
              Redirecting to leaderboard...
            </div>
        </div>
      )}

      {/* Debug Info: Detected Sign */}
      {latestPrediction && gameState === "playing" && (
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