"use client";

import { useEffect, useRef, useState } from "react";
import { type SignPrediction } from "~/lib/gameScoring";

export interface UseSignDetectionReturn {
  predictions: SignPrediction[];
  isConnected: boolean;
  handDetected: boolean;
  latency: number;
}

interface ControlMessage {
  type: "ready" | "error" | "start" | "stop";
  modelVersion?: string;
  message?: string;
}

const FRAME_RATE = 12; // fps
const FRAME_INTERVAL = 1000 / FRAME_RATE;
const MAX_PREDICTIONS = 30; // Ring buffer size
const BACKPRESSURE_THRESHOLD = 50000; // Skip frames if bufferedAmount exceeds this
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 16000; // 16s

/**
 * Hook for WebSocket-based sign detection.
 * Manages connection, frame streaming, and prediction handling.
 */
export function useSignDetection(
  captureFrame: () => Promise<Blob | null>,
  isWebcamReady: boolean,
  enabled = true,
): UseSignDetectionReturn {
  const [predictions, setPredictions] = useState<SignPrediction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [latency, setLatency] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentReconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  useEffect(() => {
    if (!enabled || !isWebcamReady) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/predict";

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          currentReconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

          // Start frame streaming
          startFrameStreaming();
        };

        ws.onmessage = (event) => {
          try {
            if (typeof event.data === "string") {
              // Control message
              const msg = JSON.parse(event.data) as ControlMessage;
              if (msg.type === "ready") {
                console.log("Model ready:", msg.modelVersion);
              } else if (msg.type === "error") {
                console.error("Server error:", msg.message);
              }
            } else {
              // Prediction (JSON)
              const text = new TextDecoder().decode(event.data as ArrayBuffer);
              const prediction = JSON.parse(text) as SignPrediction;

              // Calculate latency
              const now = performance.now() / 1000;
              const predictionLatency = now - prediction.clientTimestamp;
              setLatency(predictionLatency * 1000); // Convert to ms

              // Add to ring buffer
              setPredictions((prev) => {
                const updated = [...prev, prediction];
                if (updated.length > MAX_PREDICTIONS) {
                  updated.shift(); // Remove oldest
                }
                return updated;
              });

              // Update hand detection status
              setHandDetected(prediction.handDetected);
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
        };

        ws.onclose = () => {
          console.log("WebSocket closed");
          setIsConnected(false);
          stopFrameStreaming();

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = currentReconnectDelayRef.current;
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectAttemptsRef.current++;
              currentReconnectDelayRef.current = Math.min(
                currentReconnectDelayRef.current * 2,
                MAX_RECONNECT_DELAY,
              );
              connect();
            }, delay);
          } else {
            console.error("Max reconnection attempts reached");
          }
        };
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
      }
    }

    function startFrameStreaming() {
      if (frameIntervalRef.current !== null) {
        return; // Already streaming
      }

      frameIntervalRef.current = window.setInterval(() => {
        void sendFrame();
      }, FRAME_INTERVAL);
    }

    function stopFrameStreaming() {
      if (frameIntervalRef.current !== null) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }

    async function sendFrame() {
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN) {
        return;
      }

      // Backpressure: skip frame if send buffer is too full
      if (ws.bufferedAmount > BACKPRESSURE_THRESHOLD) {
        console.warn("Skipping frame due to backpressure");
        return;
      }

      try {
        const frameBlob = await captureFrame();
        if (!frameBlob) {
          return;
        }

        // Prepend 8-byte Float64LE timestamp
        const gameTime = performance.now() / 1000; // Convert to seconds
        const timestamp = new Float64Array([gameTime]);
        const frameData = await frameBlob.arrayBuffer();

        // Combine timestamp + JPEG data
        const combined = new Uint8Array(timestamp.byteLength + frameData.byteLength);
        combined.set(new Uint8Array(timestamp.buffer), 0);
        combined.set(new Uint8Array(frameData), timestamp.byteLength);

        ws.send(combined);
      } catch (err) {
        console.error("Failed to send frame:", err);
      }
    }

    connect();

    return () => {
      // Cleanup
      stopFrameStreaming();

      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [captureFrame, isWebcamReady, enabled]);

  return {
    predictions,
    isConnected,
    handDetected,
    latency,
  };
}
