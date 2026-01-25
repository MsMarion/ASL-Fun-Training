"use client";

import { SignSymbolPrimary } from "~/components/SignSymbolPrimary";
import { type AvailableLetter } from "~/lib/svgLoader";

interface WhackAMoleGridProps {
  availableLetters: readonly AvailableLetter[];
  targetLetter: string | null;
  onInteract: (letter: string) => void;
  holdProgress?: number; // 0 to 1
}

export function WhackAMoleGrid({ availableLetters, targetLetter, onInteract, holdProgress = 0 }: WhackAMoleGridProps) {
  return (
    <div className="grid grid-cols-7 gap-4 p-4 max-w-6xl mx-auto">
        {availableLetters.map((letter) => {
            const isTarget = letter === targetLetter;
            
            return (
                <div 
                    key={letter}
                    onClick={() => onInteract(letter)}
                    className={`
                        relative aspect-square flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer overflow-hidden
                        ${isTarget ? "bg-fuchsia-500/20 ring-4 ring-fuchsia-400 scale-105" : "bg-black/40 hover:bg-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"}
                    `}
                >
                    {/* Progress Background Overlay */}
                    {isTarget && holdProgress > 0 && (
                        <div 
                            className="absolute inset-0 bg-green-500/30 z-0 transition-all duration-75 ease-linear"
                            style={{ height: `${holdProgress * 100}%`, top: undefined, bottom: 0 }}
                        />
                    )}
                    
                    <span className="absolute top-1 left-2 font-mono text-sm opacity-50 z-10">{letter}</span>
                    <SignSymbolPrimary 
                        letter={letter}
                        state={isTarget ? "success" : "idle"}
                        className="w-full h-full z-10"
                    />
                </div>
            )
        })}
    </div>
  );
}
