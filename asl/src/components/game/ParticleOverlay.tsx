"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { ParticleEngine } from "~/lib/particleEngine";

interface ParticleOverlayProps {
  enabled?: boolean;
}

export interface ParticleOverlayRef {
  engine: ParticleEngine | null;
}

export const ParticleOverlay = forwardRef<ParticleOverlayRef, ParticleOverlayProps>(
  ({ enabled = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ParticleEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose engine instance to parent
    useImperativeHandle(ref, () => ({
      engine: engineRef.current,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Initialize particle engine
      engineRef.current = new ParticleEngine(canvas);

      // Set initial size
      const updateSize = () => {
        const rect = container.getBoundingClientRect();
        engineRef.current?.resize(rect.width, rect.height);
      };
      updateSize();

      // Start animation loop if enabled
      if (enabled) {
        engineRef.current.start();
      }

      // Watch for container resize
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        engineRef.current?.stop();
        engineRef.current = null;
      };
    }, []);

    // Toggle animation on enabled change
    useEffect(() => {
      if (engineRef.current) {
        if (enabled) {
          engineRef.current.start();
        } else {
          engineRef.current.stop();
          engineRef.current.clear();
        }
      }
    }, [enabled]);

    return (
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    );
  }
);

ParticleOverlay.displayName = "ParticleOverlay";
