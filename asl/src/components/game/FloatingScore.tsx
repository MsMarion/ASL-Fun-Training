"use client";

import { useEffect, useState } from "react";

interface ScorePopup {
    id: number;
    points: number;
    x: number;
    y: number;
    rotation: number;
}

interface FloatingScoreProps {
    trigger: { points: number; timestamp: number } | null;
}

export function FloatingScore({ trigger }: FloatingScoreProps) {
    const [popups, setPopups] = useState<ScorePopup[]>([]);

    useEffect(() => {
        if (trigger && trigger.points > 0) {
            // Positions on the LEFT side of the top half (to avoid overlap with success text)
            const positions = [
                { x: 12, y: 18 },
                { x: 8, y: 38 },
                { x: 20, y: 28 },
                { x: 15, y: 45 },
            ];

            // Pick one random position
            const pos = positions[Math.floor(Math.random() * positions.length)]!;

            const newPopup: ScorePopup = {
                id: trigger.timestamp,
                points: trigger.points,
                x: pos.x + (Math.random() * 8 - 4), // Add slight randomness
                y: pos.y + (Math.random() * 6 - 3),
                rotation: Math.random() * 12 - 6, // -6 to +6 degrees
            };
            setPopups((prev) => [...prev, newPopup]);

            // Remove popup after animation
            setTimeout(() => {
                setPopups((prev) => prev.filter((p) => p.id !== newPopup.id));
            }, 1000);
        }
    }, [trigger]);

    return (
        <>
            {popups.map((popup) => (
                <div
                    key={popup.id}
                    className="pointer-events-none fixed z-50 font-mono font-black"
                    style={{
                        left: `${popup.x}%`,
                        top: `${popup.y}%`,
                        transform: `translate(-50%, -50%) rotate(${popup.rotation}deg)`,
                        animation: "score-float 0.8s ease-in-out forwards",
                    }}
                >
                    <span
                        className="text-7xl md:text-8xl lg:text-9xl"
                        style={{
                            background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            filter: "drop-shadow(0 0 20px rgba(74, 222, 128, 0.9)) drop-shadow(0 0 40px rgba(34, 211, 238, 0.7)) drop-shadow(0 0 60px rgba(167, 139, 250, 0.5))",
                        }}
                    >
                        +{popup.points}
                    </span>
                </div>
            ))}

            <style jsx global>{`
                @keyframes score-float {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.3);
                    }
                    15% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.15);
                    }
                    30% {
                        transform: translate(-50%, -50%) scale(1);
                    }
                    60% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) translateY(-20px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9) translateY(-60px);
                    }
                }
            `}</style>
        </>
    );
}
