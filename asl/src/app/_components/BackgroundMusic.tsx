"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";

export function BackgroundMusic() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const pathname = usePathname();

    useEffect(() => {
        // Check if we are in a game route
        const isGameRoute = pathname?.startsWith("/game");

        // Handle game route logic - pause if entering game, resume if leaving (and wasn't manually paused)
        if (isGameRoute) {
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
            return; // Don't attempt to autoplay on game routes
        }

        // Attempt to play on mount or route change if not in game
        const playAudio = async () => {
            if (audioRef.current && !isPlaying && !isMuted) {
                try {
                    audioRef.current.volume = 0.1;
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (err) {
                    console.log("Autoplay blocked, waiting for interaction");
                }
            }
        };

        if (!isGameRoute) {
            void playAudio();
        }

        // Add global interaction listener for fallback
        const handleInteraction = () => {
            if (!hasInteracted && audioRef.current && !isPlaying && !isGameRoute) {
                void audioRef.current.play();
                setIsPlaying(true);
                setHasInteracted(true);
            }
        };

        window.addEventListener("click", handleInteraction);
        window.addEventListener("keydown", handleInteraction);

        return () => {
            window.removeEventListener("click", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
        };
    }, [hasInteracted, isPlaying, pathname, isMuted]);

    // Handle audio ducking events
    useEffect(() => {
        const handleDuckStart = () => {
            if (audioRef.current) {
                // Dim to 0.02
                audioRef.current.volume = 0.02;
            }
        };

        const handleDuckEnd = () => {
            if (audioRef.current) {
                // Restore to 0.1
                audioRef.current.volume = 0.1;
            }
        };

        window.addEventListener("audio-preview-start", handleDuckStart);
        window.addEventListener("audio-preview-end", handleDuckEnd);

        return () => {
            window.removeEventListener("audio-preview-start", handleDuckStart);
            window.removeEventListener("audio-preview-end", handleDuckEnd);
        };
    }, []);

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    if (pathname?.startsWith("/game")) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <audio
                ref={audioRef}
                src="/audio/menu-music.mp3"
                loop
                playsInline
            />
            <button
                onClick={toggleMute}
                className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
                aria-label={isMuted ? "Unmute music" : "Mute music"}
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
        </div>
    );
}
