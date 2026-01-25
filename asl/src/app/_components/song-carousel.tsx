"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Song {
  id: string;
  songName: string;
  albumName: string | null;
  thumbnailName?: string | null;
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
}

interface SongCarouselProps {
  songs: Song[];
}

export function SongCarousel({ songs = [] }: SongCarouselProps) {
  const router = useRouter();
  // Use a virtual index that can go negative or positive indefinitely
  const [index, setIndex] = useState(-7); // Start "off-screen" or far back for intro
  const [isLoaded, setIsLoaded] = useState(false);

  // Intro Animation Effect
  useEffect(() => {
    // Start shuffle immediately
    const startShuffle = () => {
      let current = -7;
      const target = 0;

      // Start the rotation/shuffle
      const interval = setInterval(() => {
        if (current < target) {
          current++;
          setIndex(current);
          playCardFlipSound();
        } else {
          clearInterval(interval);
        }
      }, 80); // Fast flip speed

      // Trigger fade-in *slightly* after rotation starts so it appears while moving
      setTimeout(() => {
        setIsLoaded(true);
      }, 100);
    };

    startShuffle();
  }, []);

  // Audio Context to synthesize a realistic "card flip" sound (Hybrid: Noise + Oscillator)
  const playCardFlipSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const t = ctx.currentTime;

      // --- Part 1: The "Round" Body (Oscillator) ---
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = "sine"; // Sine is the "roundest" wave
      osc.frequency.setValueAtTime(120, t); // Start at low-mid (120Hz)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1); // Drop pitch quickly (thump)

      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(0.5, t + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);

      // --- Part 2: The "Card" Texture (Filtered Noise) ---
      // Create a short buffer of white noise
      const duration = 0.1;
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filter chain: Bandpass to focus the "swish"
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500; // Center around low-mids for warmth
      filter.Q.value = 1; // Wide-ish bandwidth

      // Amplitude Envelope for the texture
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(0.5, t + 0.01); // Boosted "whoosh" volume
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(t);
    } catch (e) {
      console.error("Audio generation failed", e);
    }
  };

  // --- Audio Preview Logic ---
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleMouseEnter = (song: Song) => {
    if (!song.audioUrl) return;

    // Stop extended playback if any
    if (audioRef.current) {
      audioRef.current.pause();
    } else {
      audioRef.current = new Audio();
    }

    try {
      audioRef.current.src = song.audioUrl;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(err => console.error("Preview play error:", err));
      
      // Dispatch event to dim background music
      window.dispatchEvent(new Event("audio-preview-start"));
    } catch (e) {
      console.error("Error setting up audio preview", e);
    }
  };

  const handleMouseLeave = () => {
    if (audioRef.current) {
      // Fade out effect could be nice, but immediate stop is safer for UI responsiveness
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Dispatch event to restore background music
      window.dispatchEvent(new Event("audio-preview-end"));
    }
  };

  const navigate = (direction: number) => {
    if (songs.length === 0) return;
    playCardFlipSound();
    setIndex((prev) => prev + direction);
  };

  const handleSelectSong = (songId: string) => {
    router.push(`/game/${songId}`);
  };

  // Render a window of items around the current virtual index
  const getVisibleSongs = () => {
    if (!songs.length) return [];

    const visibleCount = 5; // Must be odd to have a center
    const range = Math.floor(visibleCount / 2); // 2

    const items = [];
    for (let i = -range; i <= range; i++) {
      const virtualIndex = index + i;
      // Modulo logic for array access handling negative numbers correctly
      let arrayIndex = virtualIndex % songs.length;
      if (arrayIndex < 0) arrayIndex += songs.length;

      items.push({
        song: songs[arrayIndex],
        virtualIndex: virtualIndex,
        offset: i // relative to center
      });
    }
    return items;
  };

  const visibleItems = getVisibleSongs();

  // 3D Geometry Parameters
  const getVariant = (offset: number) => {
    const absOffset = Math.abs(offset);

    // Config for "Rotary" Feel
    const X_SPACING = 280; // Increased spacing for wider cards
    const Z_DEPTH = -300;
    const ROTATION = 35;

    const x = offset * X_SPACING;
    const z = Math.abs(offset) * Z_DEPTH;
    const rotateY = offset * -ROTATION; // Faces center

    const scale = 1 - (absOffset * 0.15);
    const opacity = 1 - (absOffset * 0.3); // Fade out distant
    const zIndex = 100 - absOffset;

    return {
      x,
      z,
      rotateY,
      scale,
      opacity,
      zIndex
    };
  };

  return (
    <div className={`relative w-full overflow-hidden flex flex-col items-center justify-center py-20 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>

      {/* 
         Perspective container. 
         Using a wrapper to establish the 3D space.
       */}
      <div
        className="relative flex items-center justify-center w-full max-w-7xl h-[600px]"
        style={{ perspective: "1000px" }}
      >
        {/* Navigation Buttons */}
        {songs.length > 0 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-[999] text-white/70 hover:text-cyan-400 transition-colors cursor-pointer bg-black/20 p-2 rounded-full backdrop-blur-sm"
            >
              <ChevronLeft size={64} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-[999] text-white/70 hover:text-cyan-400 transition-colors cursor-pointer bg-black/20 p-2 rounded-full backdrop-blur-sm"
            >
              <ChevronRight size={64} />
            </motion.button>
          </>
        )}

        {/* 3D Scene */}
        <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence initial={false}>
            {visibleItems.map(({ song, virtualIndex, offset }) => {
              const variant = getVariant(offset);
              const isCenter = offset === 0;

              return (
                <motion.div
                  key={virtualIndex} // Stable key based on virtual timeline
                  initial={false}
                  animate={{
                    x: variant.x,
                    z: variant.z,
                    rotateY: variant.rotateY,
                    scale: variant.scale,
                    opacity: variant.opacity,
                    zIndex: variant.zIndex,
                  }}
                  exit={{ opacity: 0, scale: 0 }} // If it leaves the window
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 24,
                    mass: 1
                  }}
                  className="absolute w-96 h-[520px] cursor-pointer"
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                  onClick={() => {
                    if (isCenter) handleSelectSong(song.id);
                    else {
                      // Allow clicking side items to navigate to them
                      const diff = offset;
                      navigate(diff);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isCenter) handleMouseEnter(song);
                  }}
                  onMouseLeave={() => {
                    if (isCenter) handleMouseLeave();
                  }}
                >
                  <div
                    className={`
                       relative h-full w-full rounded-2xl overflow-hidden
                       bg-gradient-to-b from-purple-600 via-purple-700 to-purple-900
                       border-4 ${isCenter ? "border-cyan-400 shadow-[0_0_40px_rgba(45,226,230,0.5)]" : "border-purple-500"}
                       flex flex-col shadow-2xl
                       transition-all duration-300
                     `}
                  >
                    {/* Top Section: Art */}
                    <div className="h-[55%] w-full bg-purple-900 flex items-center justify-center overflow-hidden">
                      {song.thumbnailUrl || song.thumbnailName ? (
                        <img
                          src={
                            song.thumbnailUrl || 
                            (song.thumbnailName ? `https://generated-bucket-name.nyc3.digitaloceanspaces.com/${song.thumbnailName}` : "")
                            // Fallback logic requires env vars which might not be exposed safely here without NEXT_PUBLIC
                            // But since we can't easily get env vars here securely if they aren't public, 
                            // we rely on thumbnailUrl being present from DB (which is best practice) 
                            // OR we construct the path if we know the bucket pattern.
                            // The best fix is to use the full URL if available.
                          }
                          alt={song.songName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <div className="text-purple-400 text-6xl">♪</div>
                      )}
                      {/* Fallback icon if image fails */}
                      <div className="hidden text-purple-400 text-6xl">♪</div>
                    </div>

                    {/* Info Section */}
                    <div className="h-[30%] bg-purple-900/80 p-4 border-t-2 border-purple-500">
                      <h3 className="text-white font-bold text-lg truncate">
                        {song.songName}
                      </h3>
                      <p className="text-purple-300 text-sm truncate mt-1">
                        {song.albumName || "Unknown Artist"}
                      </p>
                    </div>

                    {/* Play Section */}
                    <div className="h-[15%] bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center border-t-2 border-cyan-400">
                      {isCenter && (
                        <span className="text-white font-bold tracking-wide">
                          ▶ PLAY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reflection */}
                  {isCenter && (
                    <div className="absolute top-full left-0 w-full h-[60px] bg-gradient-to-b from-cyan-400/20 to-transparent mask-image-b-fade opacity-50 scale-y-[-1] rounded-t-2xl blur-[2px]" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  ); // End Return
}
