"use client";

import { useEffect, useRef, useState } from "react";
import { type SignPrediction } from "~/lib/gameScoring";

export interface UseSignDetectionReturn {
  predictions: SignPrediction[];
  isConnected: boolean;
  handDetected: boolean;
  latency: number;
}

const FRAME_RATE = 30; // fps
const FRAME_INTERVAL = 1000 / FRAME_RATE;
const MAX_PREDICTIONS = 30; // Ring buffer size

/**
 * Hook for HTTP-based sign detection (Polling).
 * Manages frame capturing and sending to backend via POST.
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

  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Check connection/health
    async function checkHealth() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
        const res = await fetch(`${apiUrl}/`);
        if (res.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      }
    }

    // Initial check
    void checkHealth();
    const healthInterval = setInterval(checkHealth, 5000);
    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    if (!enabled || !isWebcamReady) {
      stopPolling();
      return;
    }

    startPolling();

    return () => {
      stopPolling();
    };
  }, [enabled, isWebcamReady, captureFrame]);

  // Global Keyboard Fallback Listener (Press A-Z to trigger mock prediction across all modes)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
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
        setIsConnected(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  function startPolling() {
    if (pollIntervalRef.current !== null) return;

    pollIntervalRef.current = window.setInterval(() => {
      void sendFrame();
    }, FRAME_INTERVAL);
  }

  function stopPolling() {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  async function sendFrame() {
    try {
      const frameBlob = await captureFrame();
      if (!frameBlob) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
      // console.log(`Sending frame to: ${apiUrl}`);

      const formData = new FormData();
      formData.append("file", frameBlob, "frame.jpg");

      const clientTimestamp = performance.now() / 1000;

      const res = await fetch(`${apiUrl}/predict_frame?client_timestamp=${clientTimestamp}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // const prediction = (await res.json()) as SignPrediction;
      // console.log("Received prediction:", prediction);

      const prediction = (await res.json()) as SignPrediction;

      // Calculate latency
      const now = performance.now() / 1000;
      const predictionLatency = now - prediction.clientTimestamp;
      setLatency(predictionLatency * 1000);

      // Add to ring buffer
      setPredictions((prev) => {
        const updated = [...prev, prediction];
        if (updated.length > MAX_PREDICTIONS) {
          updated.shift();
        }
        return updated;
      });

      // Update hand detection status
      if (prediction.handDetected !== handDetected) {
        console.log(`Hand status changed: ${prediction.handDetected ? "Detected" : "Lost"}`);
      }
      setHandDetected(prediction.handDetected);
      setIsConnected(true);

    } catch (err) {
      console.error("Failed to send frame:", err);
      // Optional: setIsConnected(false) on consecutive errors?
    }
  }

  return {
    predictions,
    isConnected,
    handDetected,
    latency,
  };
}
