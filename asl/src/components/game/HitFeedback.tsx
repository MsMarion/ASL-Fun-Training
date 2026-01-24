"use client";

interface HitFeedbackProps {
  text: string | null;
}

export function HitFeedback({ text }: HitFeedbackProps) {
  if (!text) return null;

  const color =
    text === "MISS!"
      ? "#f87171"
      : text === "PERFECT!"
        ? "#4ade80"
        : text === "OK!"
          ? "#60a5fa"
          : "#fbbf24";

  return (
    <div
      className="sign-feedback-text pointer-events-none absolute font-mono text-4xl font-black animate-feedback-pop"
      style={{
        color,
        top: "35%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {text}
    </div>
  );
}
