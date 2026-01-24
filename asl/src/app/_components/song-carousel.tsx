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

export function SongCarousel({ songs }: SongCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);

  const handlePrevious = () => {
    setIsShuffle(false);
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? songs.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsShuffle(false);
    setDirection(1);
    setCurrentIndex((prev) => (prev === songs.length - 1 ? 0 : prev + 1));
  };

  const handleShuffle = () => {
    if (songs.length < 2) return;

    let randomIndex = currentIndex;
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * songs.length);
    }

    setIsShuffle(true);
    setDirection(Math.random() > 0.5 ? 1 : -1);
    setCurrentIndex(randomIndex);
  };

  const handleSelectSong = (songId: string) => {
    router.push(`/song/${songId}`);
  };

  const getVisibleSongs = () => {
    if (songs.length <= 1) {
      return [{ song: songs[0], position: "center" as const }];
    }

    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    const nextIndex = (currentIndex + 1) % songs.length;

    return [
      { song: songs[prevIndex], position: "left" as const },
      { song: songs[currentIndex], position: "center" as const },
      { song: songs[nextIndex], position: "right" as const },
    ];
  };

  const visibleSongs = getVisibleSongs();

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative flex items-center justify-center gap-8 py-4 in-h-[560px]">
        {/* Left Arrow */}
        {songs.length > 1 && (
          <motion.button
            whileHover={{ scale: 1.2, x: -6 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevious}
            className="z-20 text-white hover:text-cyan-400 transition-colors cursor-pointer"
            aria-label="Previous song"
          >
            <ChevronLeft size={64} strokeWidth={3} />
          </motion.button>
        )}

        {/* Cards */}
        <div className="relative py-20 flex items-center justify-center w-full max-w-6xl px-16 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {visibleSongs.map(({ song, position }) => {
              const isCenter = position === "center";

              return (
                <motion.div
                  key={`${song.id}-${position}`}
                  custom={direction}
                  variants={isCenter ? slideVariants : undefined}
                  initial={isCenter ? "enter" : undefined}
                  animate={isCenter ? "center" : undefined}
                  exit={isCenter ? "exit" : undefined}
                  transition={{
                    x: {
                      type: "spring",
                      stiffness: isShuffle ? 1200 : 900,
                      damping: isShuffle ? 50 : 45,
                      mass: isShuffle ? 0.5 : 0.6,
                    },
                    opacity: { duration: 0.1 },
                  }}
                  onAnimationComplete={() => setIsShuffle(false)}
                  className={`
                    w-80 min-w-[20rem] max-w-[20rem]
                    ${isCenter
                      ? "h-[420px] z-10 opacity-100 scale-100"
                      : "h-[320px] z-0 opacity-50 scale-90"}
                    transition-all duration-300 ease-out
                    ${position === "left" ? "-mr-24" : ""}
                    ${position === "right" ? "-ml-24" : ""}
                  `}
                >
                  <motion.div
                    whileHover={
                      isCenter
                        ? {
                            scale: 1.05,
                            boxShadow:
                              "0 0 40px rgba(45,226,230,0.8), 0 0 80px rgba(146,0,117,0.6)",
                          }
                        : {}
                    }
                    transition={{ duration: 0.25 }}
                    className={`
                      relative h-full w-full rounded-lg overflow-hidden
                      bg-gradient-to-b from-purple-600 via-purple-700 to-purple-900
                      border-4 ${isCenter ? "border-cyan-400" : "border-purple-500"}
                      shadow-2xl
                      ${isCenter ? "cursor-pointer" : ""}
                    `}
                    onClick={() => isCenter && handleSelectSong(song.id)}
                  >
                    {/* Thumbnail */}
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

                    {/* Info */}
                    <div className="h-[30%] bg-purple-900/80 p-4 border-t-2 border-purple-500">
                      <h3 className="text-white font-bold truncate">
                        {song.songName}
                      </h3>
                      <p className="text-purple-300 text-sm truncate">
                        {song.albumName || "Unknown Album"}
                      </p>
                    </div>

                    {/* Play */}
                    <div className="h-[15%] bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center border-t-2 border-cyan-400">
                      {isCenter && (
                        <span className="text-white font-bold tracking-wide">
                          ▶ PLAY
                        </span>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right Arrow */}
        {songs.length > 1 && (
          <motion.button
            whileHover={{ scale: 1.2, x: 6 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            className="z-20 text-white hover:text-cyan-400 transition-colors cursor-pointer"
            aria-label="Next song"
          >
            <ChevronRight size={64} strokeWidth={3} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
