"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type BeatmapNote } from "~/lib/beatmap";
import { useWebcam } from "./useWebcam";
import { useSignDetection } from "./useSignDetection";

export type TestingGameState = "idle" | "playing" | "finished";

interface TestingGameMetrics {
  score: number;
  hits: number;
  misses: number;
  earlyHits: number;
  lateHits: number;
}

export function useTestingGame(beatmap: Beatmap | null) {
  const [gameState, setGameState] = useState<TestingGameState>("idle");
  const [score, setScore] = useState(0);
  const [metrics, setMetrics] = useState<TestingGameMetrics>({ score: 0, hits: 0, misses: 0, earlyHits: 0, lateHits: 0 });
  const [elapsed, setElapsed] = useState(0);
  
  // Track processed notes to avoid double-scoring
  const processedNotesRef = useRef<Set<number>>(new Set());
  const gameStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const { videoRef, canvasRef, isReady, error, captureFrame } = useWebcam();
  
  const { predictions, isConnected, handDetected, latency } = useSignDetection(
    captureFrame,
    isReady,
    true
  );

  const latestPrediction = predictions[predictions.length - 1] ?? null;

  // Constants
  const PRE_WINDOW = 2.0; // 2 seconds before
  const POST_WINDOW = 1.0; // 1 second after

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize/Update Audio when beatmap changes
  useEffect(() => {
    if (beatmap?.audioUrl) {
      if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current.src = beatmap.audioUrl;
      } else {
         audioRef.current = new Audio(beatmap.audioUrl);
      }
      audioRef.current.volume = 0.5; // Reasonable volume for testing
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
    
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    }
  }, [beatmap?.audioUrl]);

  // Start Game
  const startGame = useCallback(() => {
    if (!beatmap) return;
    setGameState("playing");
    setScore(0);
    setElapsed(0);
    setMetrics({ score: 0, hits: 0, misses: 0, earlyHits: 0, lateHits: 0 });
    processedNotesRef.current.clear();
    gameStartTimeRef.current = Date.now();
    
    // Play Audio
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.warn("Failed to play audio", e));
    }
  }, [beatmap]);

  // Let's use a Ref for latestPrediction to avoid re-creating the loop constantly.
  
  const predictionRef = useRef(latestPrediction);
  useEffect(() => { predictionRef.current = latestPrediction; }, [latestPrediction]);

  // Re-write loop to use refs
  useEffect(() => {
    if (gameState !== "playing" || !beatmap) {
        if (audioRef.current) audioRef.current.pause();
        return;
    }

    const gameLoop = () => {
        const now = Date.now();
        let currentElapsed = 0;

        // Sync with Audio if available
        if (audioRef.current) {
            currentElapsed = audioRef.current.currentTime;
            
            // Safety: If audio ends but loop is weird, rely on duration
            // Force finish if we are very close to end or audio ended
            if (audioRef.current.ended || (audioRef.current.duration > 0 && audioRef.current.currentTime >= audioRef.current.duration - 0.1)) {
                 setGameState("finished");
                 return;
            }
        } else {
            // Fallback to Date.now()
            currentElapsed = (now - gameStartTimeRef.current) / 1000;
        }

        setElapsed(currentElapsed);

        if (currentElapsed > beatmap.totalDuration) {
            setGameState("finished");
            if (audioRef.current) audioRef.current.pause();
            return;
        }

        const pred = predictionRef.current; // Access current prediction

        beatmap.notes.forEach((note, index) => {
            if (processedNotesRef.current.has(index)) return;

            const windowStart = note.time - PRE_WINDOW;
            const windowEnd = note.time + POST_WINDOW;

            if (currentElapsed > windowEnd) {
                processedNotesRef.current.add(index);
                setMetrics(prev => ({ ...prev, misses: prev.misses + 1 }));
                return;
            }

            if (currentElapsed >= windowStart && currentElapsed <= windowEnd) {
                const isCorrect = pred && 
                                  pred.letter.toLowerCase() === note.letter.toLowerCase() && 
                                  pred.confidence >= 0.5;

                if (isCorrect) {
                     processedNotesRef.current.add(index);
                     
                     // Scoring Logic: Base + Modifier based on accuracy
                     // Perfect hit (diff=0) = 100 pts
                     // Edge of window hit = 50 pts
                     
                     const diff = currentElapsed - note.time; // Negative = Early, Positive = Late
                     const absDiff = Math.abs(diff);
                     const isEarly = diff <= 0;
                     
                     const maxWindow = isEarly ? PRE_WINDOW : POST_WINDOW;
                     const accuracy = Math.max(0, 1 - (absDiff / maxWindow)); // 0 to 1
                     
                     const points = Math.round(50 + (50 * accuracy));

                     setScore(s => s + points);
                     setMetrics(prev => ({
                         ...prev,
                         score: prev.score + points,
                         hits: prev.hits + 1,
                         earlyHits: isEarly ? prev.earlyHits + 1 : prev.earlyHits,
                         lateHits: !isEarly ? prev.lateHits + 1 : prev.lateHits
                     }));
                }
            }
        });

        animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
        cancelAnimationFrame(animFrameRef.current);
    }
  }, [gameState, beatmap]); // No dependency on predictionRef, correct.

  return {
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
    latency,
    processedNotes: processedNotesRef.current
  };
}
