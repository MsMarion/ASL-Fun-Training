"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMusic } from "~/hooks/useMusic";

export function BackgroundMusic() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const { isMusicMuted } = useMusic();

    const pathname = usePathname();

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMusicMuted;
        }
    }, [isMusicMuted]);

    useEffect(() => {
        const isGameRoute = pathname?.startsWith("/game");

        if (isGameRoute) {
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
            return;
        }

        const playAudio = async () => {
            if (audioRef.current && !isPlaying && !isMusicMuted) {
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

        const handleInteraction = () => {
            if (!hasInteracted && audioRef.current && !isPlaying && !isGameRoute && !isMusicMuted) {
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
    }, [hasInteracted, isPlaying, pathname, isMusicMuted]);

    useEffect(() => {
        const handleDuckStart = () => {
            if (audioRef.current) audioRef.current.volume = 0.02;
        };

        const handleDuckEnd = () => {
            if (audioRef.current) audioRef.current.volume = 0.1;
        };

        window.addEventListener("audio-preview-start", handleDuckStart);
        window.addEventListener("audio-preview-end", handleDuckEnd);

        return () => {
            window.removeEventListener("audio-preview-start", handleDuckStart);
            window.removeEventListener("audio-preview-end", handleDuckEnd);
        };
    }, []);

    if (pathname?.startsWith("/game")) return null;

    return (
        <div className="hidden">
            <audio
                ref={audioRef}
                src="/audio/menu-music.mp3"
                loop
                playsInline
            />
        </div>
    );
}
