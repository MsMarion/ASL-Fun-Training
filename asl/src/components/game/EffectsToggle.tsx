"use client";

interface EffectsToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function EffectsToggle({ enabled, onToggle }: EffectsToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="font-mono text-xs px-2 py-1 rounded border transition-colors"
      style={{
        borderColor: enabled ? "rgba(74,222,128,0.5)" : "rgba(139,92,246,0.3)",
        color: enabled ? "#4ade80" : "#a78bfa",
        background: "rgba(13,8,32,0.8)",
      }}
      title={enabled ? "Disable visual effects" : "Enable visual effects"}
    >
      FX: {enabled ? "ON" : "OFF"}
    </button>
  );
}
