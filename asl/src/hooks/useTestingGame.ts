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

  // Start Game
  const startGame = useCallback(() => {
    if (!beatmap) return;
    setGameState("playing");
    setScore(0);
    setElapsed(0);
    setMetrics({ score: 0, hits: 0, misses: 0, earlyHits: 0, lateHits: 0 });
    processedNotesRef.current.clear();
    gameStartTimeRef.current = Date.now();
  }, [beatmap]);

  // Game Loop
  useEffect(() => {
    if (gameState !== "playing" || !beatmap) {
        cancelAnimationFrame(animFrameRef.current);
        return;
    }

    const loop = () => {
        const now = Date.now();
        const currentElapsed = (now - gameStartTimeRef.current) / 1000;
        setElapsed(currentElapsed);

        if (currentElapsed > beatmap.totalDuration) {
            setGameState("finished");
            return;
        }

        // Logic check for current notes
        beatmap.notes.forEach((note, index) => {
            // Skip if already processed
            if (processedNotesRef.current.has(index)) return;

            const windowStart = note.time - PRE_WINDOW;
            const windowEnd = note.time + POST_WINDOW;

            // Check Miss (Time expired)
            if (currentElapsed > windowEnd) {
                processedNotesRef.current.add(index);
                setMetrics(prev => ({ ...prev, misses: prev.misses + 1 }));
                return;
            }

            // Check Hit (Inside window)
            if (currentElapsed >= windowStart && currentElapsed <= windowEnd) {
                // Check prediction
                const isCorrect = latestPrediction && 
                                  latestPrediction.letter === note.letter && 
                                  latestPrediction.confidence >= 0.5;

                if (isCorrect) {
                     processedNotesRef.current.add(index);
                     
                     // Scoring Logic
                     let points = 0;
                     let isEarly = false;
                     
                     if (currentElapsed <= note.time) {
                         // Early (+100)
                         points = 100;
                         isEarly = true;
                     } else {
                         // Late (+75)
                         points = 75;
                         isEarly = false;
                     }

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

        animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameState, beatmap, latestPrediction]); // Dependency on latestPrediction is tricky for loop, but we read ref usually. 
  // However, since we are using requestAnimationFrame, we need to be careful about closure staleness.
  // Actually, `latestPrediction` inside `loop` will be stale if we don't depend on it or use a ref.
  // Let's use a Ref for latestPrediction to avoid re-creating the loop constantly.
  
  const predictionRef = useRef(latestPrediction);
  useEffect(() => { predictionRef.current = latestPrediction; }, [latestPrediction]);

  // Re-write loop to use refs
  useEffect(() => {
    if (gameState !== "playing" || !beatmap) return;

    const gameLoop = () => {
        const now = Date.now();
        const currentElapsed = (now - gameStartTimeRef.current) / 1000;
        setElapsed(currentElapsed);

        if (currentElapsed > beatmap.totalDuration) {
            setGameState("finished");
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
                                  pred.letter === note.letter && 
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
    return () => cancelAnimationFrame(animFrameRef.current);
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
