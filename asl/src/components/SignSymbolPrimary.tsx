"use client";

import { useEffect, useState } from "react";
import { loadSignSvg, type SvgData } from "~/lib/svgLoader";

export type SignState = "idle" | "success" | "miss";

interface SignSymbolPrimaryProps {
  letter: string;
  state?: SignState;
  className?: string;
}

const STATE_COLORS = {
  idle: {
    fillTop: "#f0abfc",
    fillBottom: "#c084fc",
    stroke: "#7c3aed",
    glow: "rgba(192,132,252,0.6)",
    glowLarge: "rgba(192,132,252,0.3)",
  },
  success: {
    fillTop: "#86efac",
    fillBottom: "#4ade80",
    stroke: "#166534",
    glow: "rgba(74,222,128,0.8)",
    glowLarge: "rgba(74,222,128,0.4)",
  },
  miss: {
    fillTop: "#fca5a5",
    fillBottom: "#f87171",
    stroke: "#991b1b",
    glow: "rgba(248,113,113,0.8)",
    glowLarge: "rgba(248,113,113,0.4)",
  },
};

export function SignSymbolPrimary({
  letter,
  state = "idle",
  className = "",
}: SignSymbolPrimaryProps) {
  const [svgData, setSvgData] = useState<SvgData | null>(null);

  useEffect(() => {
    loadSignSvg(letter).then(setSvgData).catch(console.error);
  }, [letter]);

  if (!svgData) return null;

  const colors = STATE_COLORS[state];
  const gradId = `primary-grad-${letter}-${state}`;
  const glowFilterId = `primary-glow-${letter}`;

  return (
    <svg
      viewBox={svgData.viewBox}
      className={`sign-primary sign-primary--${state} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
      style={{
        overflow: "visible",
        filter: `drop-shadow(0 0 25px ${colors.glow}) drop-shadow(0 0 70px ${colors.glowLarge})`,
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.fillTop} />
          <stop offset="100%" stopColor={colors.fillBottom} />
        </linearGradient>
        <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          {/* Soft inner highlight */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="80" result="innerBlur" />
          <feFlood floodColor={colors.fillTop} floodOpacity="0.4" result="glowColor" />
          <feComposite in="glowColor" in2="innerBlur" operator="in" result="softInner" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="softInner" />
          </feMerge>
        </filter>
      </defs>
      <g transform={svgData.transform}>
        <path
          d={svgData.pathData}
          fill={`url(#${gradId})`}
          stroke={colors.stroke}
          strokeWidth="50"
          strokeLinejoin="round"
          filter={`url(#${glowFilterId})`}
        />
      </g>
    </svg>
  );
}
