import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameLoop } from "~/hooks/useGameLoop";
import { type Beatmap } from "~/lib/beatmap";
import { getBeatmapWord } from "~/lib/beatmapUtils";
import { useVisualEffects } from "~/hooks/useVisualEffects";
import { WebcamFeed } from "./WebcamFeed";
import { Scoreboard } from "./Scoreboard";
import { TargetWindow } from "./TargetWindow";
import { NoteHighway } from "./NoteHighway";
import { HitFeedback } from "./HitFeedback";
import { LyricsBar } from "./LyricsBar";
import { ParticleOverlay, type ParticleOverlayRef } from "./ParticleOverlay";
import { ScreenFlash } from "./ScreenFlash";
import { EffectsToggle } from "./EffectsToggle";
import { SynthwaveBackground } from "./SynthwaveBackground";
import { DebugLogPanel } from "./DebugLogPanel";
import { NameEntryModal } from "./NameEntryModal";
import { api } from "~/trpc/react";

interface GameCanvasProps {
  beatmap: Beatmap;
  category: string;
}

export function GameCanvas({ beatmap, category }: GameCanvasProps) {
  const router = useRouter();
  const { state, videoRef, canvasRef, webcamReady, webcamError } = useGameLoop(beatmap);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [showNameModal, setShowNameModal] = useState(true);
  const [hasSubmittedStats, setHasSubmittedStats] = useState(false);

  const createPlayer = api.player.create.useMutation();
  const addMistake = api.player.addMistake.useMutation();
  const updateFinalStats = api.player.updateFinalStats.useMutation();
  const upsertLeaderboard = api.leaderboard.upsert.useMutation();

  // Mistake tracking - deduplicate mistakes
  const [lastMistakeKey, setLastMistakeKey] = useState<string>("");

  const word = getBeatmapWord(beatmap);
  const particleOverlayRef = useRef<ParticleOverlayRef>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [targetWindowCenter, setTargetWindowCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTargetWindowCenter({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
  }, []);

  useVisualEffects({
    gameState: state,
    particleEngine: particleOverlayRef.current?.engine ?? null,
    targetWindowCenter,
    enabled: effectsEnabled,
  });

  // Track mistakes using AI predictions
  useEffect(() => {
    if (!playerId || !state.currentNote || !state.latestPrediction || !state.isConnected) {
      return;
    }

    const targetLetter = state.currentNote.letter;
    const predictedLetter = state.latestPrediction.letter;
    const confidence = state.latestPrediction.confidence;

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
  }, [playerId, state.currentNote, state.latestPrediction, state.isConnected, lastMistakeKey, addMistake]);

  // Reset mistake key when current note changes
  useEffect(() => {
    setLastMistakeKey("");
  }, [state.currentNote?.letter]);

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

  // Submit stats when game ends (lives reach 0 or song completes)
  useEffect(() => {
    if (!playerId || hasSubmittedStats) return;

    const shouldSubmit = state.lives <= 0 || (state.activeNoteIndex >= state.notes.length && state.currentTime > 0);

    if (shouldSubmit) {
      setHasSubmittedStats(true);

      const totalNotes = state.notes.length;
      const correctHits = state.activeNoteIndex - (totalNotes - state.lives);
      const mistakesMade = totalNotes - correctHits;
      
      updateFinalStats.mutate({
        playerId,
        score: state.score,
        avgReactionTime: 0,
        mistakesMade: mistakesMade,
        correctHits: correctHits,
      });

      upsertLeaderboard.mutate({
        name: playerName,
        score: state.score,
        playerId: playerId,
        category: category,
      }, {
        onSuccess: () => {
          setTimeout(() => {
            router.push(`/leaderboard?playerId=${playerId}&category=${category}`);
          }, 2000);
        }
      });
    }
  }, [state.lives, state.activeNoteIndex, state.notes.length, playerId, hasSubmittedStats, state.score, state.currentTime, playerName, category, router, updateFinalStats, upsertLeaderboard]);

  const adjustedIdx = Math.min(state.activeNoteIndex, word.length - 1);
  const bgHue = 250 - Math.min(state.streak * 2, 40);
  const bgColor = `hsl(${bgHue}, 40%, 6%)`;
  const shouldFlash = state.lastHitQuality === "PERFECT" && state.noteState === "success";

  // Check if game is over
  const isGameOver = state.lives <= 0 || (state.activeNoteIndex >= state.notes.length && state.currentTime > 0);

  return (
    <div
      className="game-grid relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: bgColor, transition: "background 0.5s ease-out" }}
    >
      <NameEntryModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        onCancel={handleCancel}
        isLoading={createPlayer.isPending}
      />

      <ParticleOverlay ref={particleOverlayRef} enabled={effectsEnabled} />
      <ScreenFlash trigger={shouldFlash} />
      <SynthwaveBackground />

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-sm font-mono text-cyan-400 mb-2">PLAYER: {playerName}</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {state.lives <= 0 ? "GAME OVER" : "SONG COMPLETE"}
          </h2>
          <div className="text-8xl font-black text-purple-400 mb-8">{state.score}</div>
          
          <div className="grid grid-cols-2 gap-8 text-center mb-12">
            <div className="flex flex-col">
              <span className="text-gray-400">STREAK</span>
              <span className="text-2xl font-bold text-yellow-400">{state.streak}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400">LIVES</span>
              <span className="text-2xl font-bold text-red-400">{state.lives}</span>
            </div>
          </div>
          
          <div className="text-cyan-400 font-mono animate-pulse">
            Redirecting to leaderboard...
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between p-4">
        <WebcamFeed
          videoRef={videoRef}
          canvasRef={canvasRef}
          isReady={webcamReady}
          error={webcamError}
          isConnected={state.isConnected}
          handDetected={state.handDetected}
        />
        <div className="flex flex-col items-end gap-2">
          <Scoreboard score={state.score} streak={state.streak} lives={state.lives} />
          <EffectsToggle enabled={effectsEnabled} onToggle={() => setEffectsEnabled(!effectsEnabled)} />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <TargetWindow
          letter={state.feedbackLetter ?? state.currentNote?.letter ?? null}
          state={state.noteState}
          streak={state.streak}
          isMatching={
            state.noteState === "idle" &&
            state.currentNote !== null &&
            state.latestPrediction !== null &&
            state.latestPrediction.letter === state.currentNote.letter &&
            state.latestPrediction.confidence >= 0.5
          }
        />
        <HitFeedback
          text={state.feedbackText}
          streak={state.streak}
          streakMilestone={state.streakMilestone}
          comboMultiplier={state.comboMultiplier}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-2 p-4">
        <NoteHighway
          notes={state.notes}
          currentTime={state.currentTime}
          activeNoteIndex={state.activeNoteIndex}
        />
        <LyricsBar word={word} currentLetterIndex={adjustedIdx} />
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div
          className="font-mono text-sm font-semibold px-4 py-2 rounded-full"
          style={{
            background: "rgba(13,8,32,0.8)",
            color: "#e0e7ff",
            border: "1px solid rgba(217,70,239,0.3)",
          }}
        >
          {beatmap.title}
        </div>
      </div>

      {state.latestPrediction && (
        <div className="absolute bottom-20 left-4 z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur text-white px-2 py-1 rounded-md border border-white/10 shadow-sm flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono">AI:</span>
            <span className="text-lg font-bold text-cyan-400">
              {state.latestPrediction.letter}
            </span>
            <span className="text-[10px] text-green-400/80 font-mono">
              {Math.min(100, (state.latestPrediction.confidence * 100)).toFixed(0)}%
            </span>
            <span className={`text-[10px] font-mono ${state.latency < 100 ? "text-green-400/60" : state.latency < 200 ? "text-yellow-400/60" : "text-red-400/60"}`}>
              {state.latency}ms
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-20 right-4 z-20 pointer-events-none">
        <div className="bg-black/60 backdrop-blur text-white px-3 py-2 rounded-md border border-white/10 shadow-sm">
          <div className="text-[10px] text-gray-400 font-mono mb-1">TARGET</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-fuchsia-400">
              {state.currentNote?.letter ?? "—"}
            </span>
            <div className="flex flex-col text-[10px] font-mono text-gray-300">
              <span>Time: {state.currentNote?.time?.toFixed(1) ?? "—"}s</span>
              <span>Now: {state.currentTime.toFixed(1)}s</span>
              <span>State: <span className={
                state.noteState === "success" ? "text-green-400" :
                state.noteState === "miss" ? "text-red-400" : "text-gray-400"
              }>{state.noteState}</span></span>
            </div>
          </div>
        </div>
      </div>

      <DebugLogPanel entries={state.debugLog} currentTime={state.currentTime} />
    </div>
  );
}