"use client";

import { useEffect, useState } from "react";
import { loadSignSvg, type SvgData } from "~/lib/svgLoader";

interface SignSymbolHighwayProps {
  letter: string;
  className?: string;
  color?: string;
}

export function SignSymbolHighway({
  letter,
  className = "",
  color = "#d946ef",
}: SignSymbolHighwayProps) {
  const [svgData, setSvgData] = useState<SvgData | null>(null);

  useEffect(() => {
    loadSignSvg(letter).then(setSvgData).catch(console.error);
  }, [letter]);

  if (!svgData) return null;

  const filterId = `neon-glow-${letter}`;

  return (
    <svg
      viewBox={svgData.viewBox}
      className={`sign-highway ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="100" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={svgData.transform}>
        <path
          d={svgData.pathData}
          fill="none"
          stroke={color}
          strokeWidth="60"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#${filterId})`}
        />
      </g>
    </svg>
  );
}
