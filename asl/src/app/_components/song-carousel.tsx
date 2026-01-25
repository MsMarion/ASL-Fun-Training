"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Song {
  id: string;
  songName: string;
  albumName: string | null;
  thumbnailName?: string | null;
}

interface SongCarouselProps {
  songs: Song[];
}

export function SongCarousel({ songs = [] }: SongCarouselProps) {
  const router = useRouter();
  // Use a virtual index that can go negative or positive indefinitely
  // giving each 'slot' in the timeline a unique ID.
  const [index, setIndex] = useState(0);

  // Short "tick" / card flip sound (Base64 wrapper for a simple UI click)
  // This is a short placeholder sound.
  const flipSoundUrl = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  // Actually, empty wav isn't great. Let's use a real, very short "tick" sound Base64.
  // Using a known short "pop" or "click" sound.
  const FLIP_SFX = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAJAAACOAAKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoK//uQZAAAAAAAIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqk=";
  // Okay, generating a real Base64 string for a sound is risky without a file. 
  // Better approach: Use the existing 'hit.mp3' for now as a placeholder or assuming the user will add 'flip.mp3'.
  // But the user asked ME to add it. 
  // I will use a simple implementation that attempts to play '/audio/card-flip.mp3' and fallbacks or just implementation logic. 
  // Wait, I can't easily generate a valid MP3 base64 from scratch in my head.
  // I will add the Logic to play a file called `/audio/flip.mp3` and I will CREATE that file using `write_to_file` if I can? No, I can't write binary easily.
  // I will use `hit.mp3` for now as a placeholder or - wait, `hit.mp3` is 145 bytes? That's tiny. It might be a simple click.
  // Let's try pointing to `/hit.mp3` first since it exists in public.

  const playFlipSound = () => {
    // Using hit.mp3 as a placeholder for the flip sound since it exists
    const audio = new Audio("/hit.mp3");
    audio.volume = 0.3;
    audio.currentTime = 0;
    audio.play().catch((e) => console.log("Audio play failed", e));
  };

  const navigate = (direction: number) => {
    if (songs.length === 0) return;
    playFlipSound();
    setIndex((prev) => prev + direction);
  };

  const handleSelectSong = (songId: string) => {
    router.push(`/song/${songId}`);
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
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center py-20">

      {/* 
         Perspective container. 
         Using a wrapper to establish the 3D space.
       */}
      <div
        className="relative flex items-center justify-center w-full max-w-7xl h-[600px]"
        style={{ perspective: "1000px" }}
      >
        {/* Navigation Buttons */}
        {songs.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-cyan-400 transition-colors cursor-pointer bg-black/20 p-2 rounded-full backdrop-blur-sm"
            >
              <ChevronLeft size={64} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-cyan-400 transition-colors cursor-pointer bg-black/20 p-2 rounded-full backdrop-blur-sm"
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
                      {song.thumbnailName ? (
                        <img
                          src={`/api/songs/thumbnail/${song.thumbnailName}`}
                          alt={song.songName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-purple-400 text-6xl">♪</div>
                      )}
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
