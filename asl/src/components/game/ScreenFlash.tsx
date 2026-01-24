"use client";

import { useEffect, useState } from "react";

interface ScreenFlashProps {
  trigger: boolean;
}

export function ScreenFlash({ trigger }: ScreenFlashProps) {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsFlashing(true);
      const timeout = setTimeout(() => setIsFlashing(false), 350);
      return () => clearTimeout(timeout);
    }
  }, [trigger]);

  if (!isFlashing) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: "radial-gradient(circle, rgba(74, 222, 128, 0.3) 0%, transparent 70%)",
        animation: "screen-flash 0.35s ease-out forwards",
        zIndex: 2,
      }}
    />
  );
}
