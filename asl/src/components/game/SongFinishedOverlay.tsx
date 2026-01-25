"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSoundEffects } from "~/hooks/useSoundEffects";

interface SongFinishedOverlayProps {
    show: boolean;
    onRedirect?: () => void; // Optional override 
}

export function SongFinishedOverlay({ show, onRedirect }: SongFinishedOverlayProps) {
    const router = useRouter();
    const { playGameFinishedSound } = useSoundEffects();
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        if (show) {
            setVisible(true);
            playGameFinishedSound();
            
            const timer = setTimeout(() => {
                if (onRedirect) {
                    onRedirect();
                } else {
                    router.push("/songselection");
                }
            }, 3000); // 3 seconds delay
            
            return () => clearTimeout(timer);
        }
    }, [show, onRedirect, playGameFinishedSound, router]);

    if (!visible && !show) return null;

    return (
        <div 
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div className="flex flex-col items-center animate-bounce-in">
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_0_50px_rgba(234,179,8,0.5)] transform scale-150 mb-8">
                    SONG FINISHED!
                </h1>
                <div className="text-2xl text-white font-mono animate-pulse">
                    Returning to menu...
                </div>
            </div>
            
            <style jsx>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
}
