"use client";

interface WebcamFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  error: string | null;
  isConnected: boolean;
  handDetected: boolean;
}

/**
 * Webcam feed component with connection status and hand detection indicators.
 * Replaces WebcamPlaceholder with real camera stream.
 */
export function WebcamFeed({
  videoRef,
  canvasRef,
  isReady,
  error,
  isConnected,
  handDetected,
}: WebcamFeedProps) {
  // Determine connection status color
  const statusColor = error
    ? "#ef4444" // red (error)
    : !isReady
      ? "#6b7280" // gray (loading)
      : !isConnected
        ? "#eab308" // yellow (disconnected)
        : "#22c55e"; // green (connected)

  const statusText = error
    ? "Error"
    : !isReady
      ? "Loading..."
      : !isConnected
        ? "Reconnecting..."
        : "Connected";

  return (
    <div className="relative">
      {/* Webcam video feed */}
      <div
        className="relative overflow-hidden rounded-lg border-2"
        style={{
          borderColor: isReady ? "#a855f7" : "#4b5563",
          width: "320px",
          height: "240px",
          background: "#1f2937",
        }}
      >
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{
            display: isReady && !error ? "block" : "none",
            transform: "scaleX(-1)", // Mirror the video
          }}
        />

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Placeholder/error state */}
        {(!isReady || error) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {error ? (
              <>
                <div className="mb-2 text-4xl">⚠️</div>
                <div className="text-sm text-red-400">{error}</div>
              </>
            ) : (
              <>
                <div className="mb-2 text-4xl">📹</div>
                <div className="text-sm text-gray-400">Initializing camera...</div>
              </>
            )}
          </div>
        )}

        {/* Hand detection prompt */}
        {isReady && !error && isConnected && !handDetected && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs text-yellow-400">
            Show your hand
          </div>
        )}
      </div>

      {/* Connection status indicator */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span style={{ color: statusColor }}>{statusText}</span>
      </div>
    </div>
  );
}
