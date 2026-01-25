"use client";

import { SignSymbolPrimary } from "~/components/SignSymbolPrimary";
import { type AvailableLetter } from "~/lib/svgLoader";
import { useEffect, useState } from "react";

interface WhackAMoleGridProps {
    availableLetters: readonly AvailableLetter[];
    targetLetter: string | null;
    onInteract: (letter: string) => void;
    holdProgress?: number; // 0 to 1
    recentSuccess?: string | null; // Letter that was just successfully matched
    successCount?: number; // Total number of correct answers for message variety
}

const SUCCESS_MESSAGES = ["GREAT!", "PERFECT!", "AMAZING!", "AWESOME!", "NICE!"];

export function WhackAMoleGrid({ availableLetters, targetLetter, onInteract, holdProgress = 0, recentSuccess, successCount = 0 }: WhackAMoleGridProps) {
    const [celebratingLetter, setCelebratingLetter] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string>("");

    // Track when a letter is successfully completed
    useEffect(() => {
        if (recentSuccess) {
            setCelebratingLetter(recentSuccess);
            // Pick a message based on success count for variety
            const isStreak = successCount > 0 && successCount % 5 === 0;
            setSuccessMessage(isStreak ? "🔥 ON FIRE! 🔥" : SUCCESS_MESSAGES[successCount % 5] ?? "GREAT!");

            // Short celebration - disappear quickly as next target appears
            const timer = setTimeout(() => {
                setCelebratingLetter(null);
                setSuccessMessage("");
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [recentSuccess, successCount]);

    return (
        <div className="grid grid-cols-7 gap-4 p-4 max-w-6xl mx-auto">
            {availableLetters.map((letter) => {
                const isTarget = letter === targetLetter;
                const isCelebrating = letter === celebratingLetter;
                const isComplete = isTarget && holdProgress >= 1;

                return (
                    <div
                        key={letter}
                        onClick={() => onInteract(letter)}
                        className={`
                            relative aspect-square flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer overflow-visible
                            ${isTarget && !isCelebrating ? "bg-fuchsia-500/20 ring-4 ring-fuchsia-400 scale-105" : ""}
                            ${!isTarget && !isCelebrating ? "bg-black/40 hover:bg-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100" : ""}
                            ${isCelebrating ? "scale-125 z-40" : ""}
                        `}
                        style={isCelebrating ? {
                            background: "radial-gradient(circle, rgba(74, 222, 128, 0.4) 0%, rgba(34, 211, 238, 0.2) 50%, transparent 80%)",
                            boxShadow: "0 0 60px 20px rgba(74, 222, 128, 0.6), 0 0 100px 40px rgba(34, 211, 238, 0.4), 0 0 140px 60px rgba(168, 85, 247, 0.3)",
                        } : undefined}
                    >
                        {/* Progress Background Overlay */}
                        {isTarget && holdProgress > 0 && !isCelebrating && (
                            <div
                                className="absolute inset-0 z-0 transition-all duration-75 ease-linear rounded-xl"
                                style={{
                                    height: `${holdProgress * 100}%`,
                                    top: undefined,
                                    bottom: 0,
                                    background: isComplete
                                        ? "linear-gradient(to top, rgba(74, 222, 128, 0.6), rgba(34, 211, 238, 0.4))"
                                        : "rgba(74, 222, 128, 0.3)",
                                    boxShadow: isComplete ? "0 0 20px rgba(74, 222, 128, 0.5)" : undefined,
                                }}
                            />
                        )}

                        {/* Green ring overlay on success */}
                        {isCelebrating && (
                            <div
                                className="absolute inset-0 rounded-xl z-20 animate-ring-glow"
                                style={{
                                    border: "4px solid #4ade80",
                                    boxShadow: "inset 0 0 30px rgba(74, 222, 128, 0.5)",
                                }}
                            />
                        )}

                        {/* Confetti particles on success */}
                        {isCelebrating && (
                            <div className="absolute inset-0 z-40 pointer-events-none overflow-visible">
                                {['🎉', '⭐', '✨', '🌟', '💫', '🎊', '✓', '★'].map((emoji, i) => (
                                    <span
                                        key={i}
                                        className="absolute"
                                        style={{
                                            left: '50%',
                                            top: '50%',
                                            fontSize: i === 6 ? '2rem' : '1.5rem',
                                            animation: `confetti-burst 1s ease-out ${i * 0.05}s forwards`,
                                            opacity: 0,
                                            ['--confetti-angle' as string]: `${i * 45}deg`,
                                            ['--confetti-distance' as string]: `${80 + (i % 3) * 20}px`,
                                        }}
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        )}

                        <span className={`absolute top-1 left-2 font-mono text-sm z-10 ${isCelebrating ? "opacity-0" : "opacity-50"}`}>{letter}</span>
                        <SignSymbolPrimary
                            letter={letter}
                            state={isCelebrating ? "success" : isTarget ? "success" : "idle"}
                            className={`w-full h-full z-10 transition-opacity duration-200 ${isCelebrating ? "opacity-20" : ""}`}
                        />
                    </div>
                )
            })}

            <style jsx global>{`
                @keyframes tile-celebrate {
                    0% { 
                        transform: scale(1.05);
                        opacity: 1;
                    }
                    15% { 
                        transform: scale(1.2);
                        opacity: 1;
                    }
                    100% { 
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                @keyframes ring-glow {
                    0% { 
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    15% {
                        opacity: 1;
                        transform: scale(1.05);
                    }
                    60% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1);
                    }
                }

                @keyframes success-text {
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
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                }

                @keyframes confetti-burst {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                        transform: translate(
                            calc(-50% + cos(var(--confetti-angle, 0deg)) * var(--confetti-distance, 80px)),
                            calc(-50% + sin(var(--confetti-angle, 0deg)) * var(--confetti-distance, 80px) - 40px)
                        ) scale(0.3);
                    }
                }

                .animate-tile-celebrate {
                    animation: tile-celebrate 0.6s ease-out forwards;
                }

                .animate-ring-glow {
                    animation: ring-glow 0.6s ease-in-out forwards;
                }

                .animate-success-text {
                    animation: success-text 0.6s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
}
