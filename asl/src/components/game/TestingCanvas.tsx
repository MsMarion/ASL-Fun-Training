"use client";

import { useTestingGame } from "~/hooks/useTestingGame";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { WebcamFeed } from "./WebcamFeed";
import { type Beatmap } from "~/lib/beatmap";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TestingNoteHighway } from "./TestingNoteHighway";
import { NameEntryModal } from "./NameEntryModal";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

interface TestingCanvasProps {
  beatmap: Beatmap;
  category: string;
}

export function TestingCanvas({ beatmap, category }: TestingCanvasProps) {
  const router = useRouter();
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

  // Background SVG State
  const [bgSvg, setBgSvg] = useState<{ pathData: string, viewBox: string, transform: string } | null>(null);

  // Mistake tracking - deduplicate mistakes
  const [lastMistakeKey, setLastMistakeKey] = useState<string>("");

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

  // Track mistakes using AI predictions
  useEffect(() => {
    if (!playerId || !activeNote || !latestPrediction || !isConnected || gameState !== "playing") {
      return;
    }

    const targetLetter = activeNote.letter;
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
  }, [playerId, activeNote, latestPrediction, isConnected, gameState, lastMistakeKey, addMistake]);

  // Reset mistake key when active note changes
  useEffect(() => {
    setLastMistakeKey("");
  }, [activeNote?.letter]);

  useEffect(() => {
      // detect changes in metrics for feedback
      if (metrics.hits > lastMetrics.hits) {
          const pointsGained = metrics.score - lastMetrics.score;
          
          let text = `+${pointsGained}`;
          let color = "text-yellow-400";
          
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
      } else if (metrics.misses > lastMetrics.misses) {
          setFeedback({ text: "MISS", color: "text-red-500", id: Date.now() });
      }
      setLastMetrics(metrics);
  }, [metrics, lastMetrics]);

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

    const avgReactionTime = 0; // TODO: track reaction times in useTestingGame

    updateFinalStats.mutate({
      playerId,
      score: metrics.score,
      avgReactionTime: avgReactionTime,
      mistakesMade: metrics.misses,
      correctHits: metrics.hits,
    });

    upsertLeaderboard.mutate({
      name: playerName,
      score: metrics.score,
      playerId: playerId,
      category: category,
    }, {
      onSuccess: () => {
        console.log("✅ Stats saved to leaderboard");
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
        {gameState === "playing" && bgSvg && activeNote && (
            <motion.div 
                key={activeNote.letter}
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
              {playerName ? `PLAYER: ${playerName}` : "SIGN HERO"}
            </div>
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

          {/* Note Highway */}
          {gameState === "playing" && (
              <TestingNoteHighway notes={beatmap.notes} elapsed={elapsed} />
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
         {gameState === "idle" && !showNameModal && (
            <div className="flex flex-col items-center z-50">
                <h1 className="text-6xl font-bold mb-8">SIGN HERO</h1>
                 <button 
                    onClick={startGame}
                    className="px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl rounded-full shadow-lg hover:scale-105 transition-all"
                >
                    START GAME
                </button>
            </div>
         )}
      </div>

       {/* Results Screen - Brief display before redirect */}
       {gameState === "finished" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="text-sm font-mono text-cyan-400 mb-2">PLAYER: {playerName}</div>
            <h2 className="text-3xl font-bold text-white mb-4">GAME COMPLETE</h2>
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
            
            <div className="text-cyan-400 font-mono animate-pulse">
              Redirecting to leaderboard...
            </div>
        </div>
       )}

      {/* AI Prediction Debug Display */}
      {latestPrediction && gameState === "playing" && (
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur text-white px-3 py-2 rounded-md border border-white/10">
          <div className="text-[10px] text-gray-400 font-mono mb-1">AI PREDICTION</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{latestPrediction.letter}</span>
            <span className="text-[10px] text-green-400/80 font-mono">
              {(latestPrediction.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}