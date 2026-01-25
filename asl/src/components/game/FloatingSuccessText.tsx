"use client";

import { useEffect, useState } from "react";

interface SuccessMessage {
    id: number;
    text: string;
    x: number;
    y: number;
    rotation: number;
}

interface FloatingSuccessTextProps {
    trigger: { text: string; timestamp: number } | null;
}

export function FloatingSuccessText({ trigger }: FloatingSuccessTextProps) {
    const [message, setMessage] = useState<SuccessMessage | null>(null);

    useEffect(() => {
        if (trigger && trigger.text) {
            // Positions on the RIGHT side of the top half (to avoid overlap with points)
            const positions = [
                { x: 88, y: 18 },
                { x: 92, y: 38 },
                { x: 80, y: 28 },
                { x: 85, y: 45 },
            ];

            // Pick one random position
            const pos = positions[Math.floor(Math.random() * positions.length)]!;

            const newMessage: SuccessMessage = {
                id: trigger.timestamp,
                text: trigger.text,
                x: pos.x + (Math.random() * 8 - 4), // Add slight randomness
                y: pos.y + (Math.random() * 6 - 3),
                rotation: Math.random() * 16 - 8, // -8 to +8 degrees
            };

            setMessage(newMessage);

            // Remove message after animation
            const timer = setTimeout(() => {
                setMessage(null);
            }, 700);

            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (!message) return null;

    return (
        <>
            <div
                className="fixed z-50 pointer-events-none"
                style={{
                    left: `${message.x}%`,
                    top: `${message.y}%`,
                    transform: `translate(-50%, -50%) rotate(${message.rotation}deg)`,
                }}
            >
                <div
                    className="text-5xl md:text-6xl lg:text-7xl font-black whitespace-nowrap animate-floating-text"
                    style={{
                        background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #d946ef 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 15px rgba(74, 222, 128, 0.8)) drop-shadow(0 0 30px rgba(34, 211, 238, 0.5))",
                    }}
                >
                    {message.text}
                </div>
            </div>

            <style jsx global>{`
                @keyframes floating-text-anim {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    15% {
                        opacity: 1;
                        transform: scale(1.1);
                    }
                    30% {
                        transform: scale(1);
                    }
                    60% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                }

                .animate-floating-text {
                    animation: floating-text-anim 0.7s ease-in-out forwards;
                }
            `}</style>
        </>
    );
}
