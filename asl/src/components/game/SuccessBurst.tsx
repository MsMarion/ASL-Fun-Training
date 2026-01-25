"use client";

import { useEffect, useState } from "react";

interface SuccessBurstProps {
    trigger: number; // Change this to trigger a new burst
}

export function SuccessBurst({ trigger }: SuccessBurstProps) {
    const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

    useEffect(() => {
        if (trigger > 0) {
            // Create burst at center of screen
            const newBurst = {
                id: Date.now(),
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
            };
            setBursts((prev) => [...prev, newBurst]);

            // Remove burst after animation
            setTimeout(() => {
                setBursts((prev) => prev.filter((b) => b.id !== newBurst.id));
            }, 1000);
        }
    }, [trigger]);

    return (
        <>
            {bursts.map((burst) => (
                <div
                    key={burst.id}
                    className="pointer-events-none fixed inset-0 z-50"
                    style={{
                        perspective: "1000px",
                    }}
                >
                    {/* Central flash */}
                    <div
                        className="absolute"
                        style={{
                            left: "50%",
                            top: "40%",
                            transform: "translate(-50%, -50%)",
                            animation: "success-flash 0.6s ease-out forwards",
                        }}
                    >
                        <div
                            className="w-64 h-64 rounded-full"
                            style={{
                                background: "radial-gradient(circle, rgba(74, 222, 128, 0.8) 0%, rgba(34, 211, 238, 0.4) 40%, transparent 70%)",
                                boxShadow: "0 0 80px 40px rgba(74, 222, 128, 0.5), 0 0 120px 60px rgba(34, 211, 238, 0.3)",
                                animation: "success-burst-scale 0.6s ease-out forwards",
                            }}
                        />
                    </div>

                    {/* Particle rays */}
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                left: "50%",
                                top: "40%",
                                width: "4px",
                                height: "60px",
                                background: `linear-gradient(to bottom, ${i % 2 === 0 ? "#4ade80" : "#22d3ee"}, transparent)`,
                                borderRadius: "2px",
                                transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                transformOrigin: "bottom center",
                                animation: `success-ray 0.5s ease-out ${i * 0.02}s forwards`,
                                opacity: 0,
                            }}
                        />
                    ))}

                    {/* Floating particles */}
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={`particle-${i}`}
                            className="absolute w-3 h-3 rounded-full"
                            style={{
                                left: "50%",
                                top: "40%",
                                background: i % 2 === 0 ? "#4ade80" : "#fbbf24",
                                boxShadow: `0 0 10px ${i % 2 === 0 ? "#4ade80" : "#fbbf24"}`,
                                animation: `success-particle 0.8s ease-out ${i * 0.05}s forwards`,
                                opacity: 0,
                                "--particle-angle": `${i * 45}deg`,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            ))}

            <style jsx global>{`
        @keyframes success-flash {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2);
          }
        }

        @keyframes success-burst-scale {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        @keyframes success-ray {
          0% {
            opacity: 0;
            height: 0;
          }
          30% {
            opacity: 1;
            height: 80px;
          }
          100% {
            opacity: 0;
            height: 150px;
            transform: translate(-50%, -150%) rotate(var(--rotation, 0deg));
          }
        }

        @keyframes success-particle {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          30% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(
              calc(-50% + cos(var(--particle-angle, 0deg)) * 150px),
              calc(-50% + sin(var(--particle-angle, 0deg)) * 150px - 50px)
            ) scale(0.5);
          }
        }
      `}</style>
        </>
    );
}
