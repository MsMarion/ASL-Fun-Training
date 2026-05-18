"use client";

interface HitFeedbackProps {
  text: string | null;
  streak?: number;
  streakMilestone?: number | null;
  comboMultiplier?: number;
}

export function HitFeedback({
  text,
  streak = 0,
  streakMilestone,
  comboMultiplier = 1,
}: HitFeedbackProps) {
  const color =
    text?.includes("MISS")
      ? "#f87171" // Red
      : text?.includes("HIT")
        ? "#4ade80" // Green
        : "#fbbf24"; // Default Yellow

  const showCombo = text && text !== "MISS!" && comboMultiplier > 1;

  // Milestone banner text
  let milestoneText = "";
  if (streakMilestone === 5) milestoneText = "5x STREAK!";
  if (streakMilestone === 10) milestoneText = "10x FIRE!";
  if (streakMilestone === 25) milestoneText = "25x UNSTOPPABLE!";

  return (
    <>
      {/* Hit feedback text */}
      {text && (
        <div
          className="sign-feedback-text pointer-events-none absolute font-mono text-4xl font-black animate-feedback-pop whitespace-nowrap text-center tracking-wider"
          style={{
            color,
            top: "35%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textShadow: `0 0 20px ${color}, 0 2px 4px rgba(0,0,0,0.8)`,
          }}
        >
          {text}
        </div>
      )}

      {/* Combo multiplier */}
      {showCombo && (
        <div
          className="pointer-events-none absolute font-mono text-xl font-bold whitespace-nowrap text-center tracking-wider"
          style={{
            color: "#fbbf24",
            top: "42%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "combo-scale 0.3s ease-out",
            textShadow: "0 0 10px rgba(251, 191, 36, 0.8)",
          }}
        >
          ×{comboMultiplier}
        </div>
      )}

      {/* Milestone banner */}
      {milestoneText && (
        <div
          className="pointer-events-none absolute font-mono text-5xl font-black whitespace-nowrap text-center tracking-widest"
          style={{
            color: "#d946ef",
            top: "25%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "milestone-pop 1.5s ease-out forwards",
            textShadow:
              "0 0 20px rgba(217, 70, 239, 1), 0 0 40px rgba(217, 70, 239, 0.8)",
          }}
        >
          {milestoneText}
        </div>
      )}
    </>
  );
}
