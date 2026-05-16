"use client";

import { useEffect, useRef, useState } from "react";
import { type SignPrediction } from "~/lib/gameScoring";

export interface UseSignDetectionReturn {
  predictions: SignPrediction[];
  isConnected: boolean;
  handDetected: boolean;
  latency: number;
}

const MAX_PREDICTIONS = 30; // Ring buffer size

/**
 * Hook for WebSocket-based sign detection with Client-Side MediaPipe.
 * Manages local landmark extraction and streaming to Python micro-batcher.
 */
export function useSignDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isWebcamReady: boolean,
  enabled = true,
): UseSignDetectionReturn {
  const [predictions, setPredictions] = useState<SignPrediction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [latency, setLatency] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const handsRef = useRef<any | null>(null);
  const animFrameRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enabled) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4001/ws/predict";
    console.log(`Connecting WebSocket to: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnected(false);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        isSendingRef.current = false; // Acknowledge receipt (One-in-Flight)
        const data = JSON.parse(event.data as string);

        if (data.type === "ready" || data.type === "error") {
          return;
        }

        if (data.letter !== undefined) {
          const prediction: SignPrediction = {
            letter: data.letter,
            confidence: data.confidence,
            clientTimestamp: data.clientTimestamp,
            handDetected: data.handDetected,
          };

          const now = performance.now() / 1000;
          setLatency((now - prediction.clientTimestamp) * 1000);

          setPredictions((prev) => {
            const updated = [...prev, prediction];
            if (updated.length > MAX_PREDICTIONS) updated.shift();
            return updated;
          });
          setHandDetected(prediction.handDetected);
        }
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  // Initialize MediaPipe Hands in browser
  useEffect(() => {
    if (typeof window === "undefined" || !enabled || !isWebcamReady || !videoRef.current) return;

    let mounted = true;
    let lastSendTime = 0;

    async function initMediaPipe() {
      try {
        const { Hands } = await import("@mediapipe/hands");
        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          if (!mounted) return;

          const hasHand = Boolean(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isSendingRef.current) {
            isSendingRef.current = true;
            const clientTimestamp = performance.now() / 1000;
            const payload = {
              clientTimestamp,
              handDetected: hasHand,
              landmarks: hasHand ? results.multiHandLandmarks[0] : [],
            };
            wsRef.current.send(JSON.stringify(payload));
          }
        });

        handsRef.current = hands;

        const video = videoRef.current;
        if (!video) return;

        const detectFrame = async (now: number) => {
          if (!mounted || !handsRef.current || !video) return;

          if (now - lastSendTime >= 33) { // ~30 fps throttling
            lastSendTime = now;
            if (video.readyState >= 2 && !isSendingRef.current) {
              try {
                await handsRef.current.send({ image: video });
              } catch (err) {
                // Ignore transient frame send errors during page navigation
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animFrameRef.current = requestAnimationFrame(detectFrame);

      } catch (err) {
        console.error("Failed to load MediaPipe Hands:", err);
      }
    }

    void initMediaPipe();

    return () => {
      mounted = false;
      cancelAnimationFrame(animFrameRef.current);
      if (handsRef.current && typeof handsRef.current.close === "function") {
        try { handsRef.current.close(); } catch (e) {}
      }
      handsRef.current = null;
    };
  }, [enabled, isWebcamReady, videoRef]);

  // Global Keyboard Fallback Listener
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const keyLetter = e.key.toLowerCase();
        const keyPrediction: SignPrediction = {
          letter: keyLetter,
          confidence: 1.0,
          clientTimestamp: performance.now() / 1000,
          handDetected: true,
          isKeyboard: true,
        };

        setPredictions((prev) => {
          const updated = [...prev, keyPrediction];
          if (updated.length > MAX_PREDICTIONS) updated.shift();
          return updated;
        });
        setHandDetected(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  return {
    predictions,
    isConnected,
    handDetected,
    latency,
  };
}

