"use client";

import { trpc } from "@/trpc/client";
import { SongCarousel } from "@/app/_components/song-carousel";

export default function SongSelection() {
  const { data: curatedSongs, isLoading, error } = trpc.song.getOfficialSongs.useQuery();

  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center mb-8 shrink-0">
        <h1 className="text-6xl font-[display-font] text-white mb-4 animate-pulse"
          style={{
            textShadow: "0 0 20px rgba(45,226,230,0.5), 0 0 40px rgba(146,0,117,0.3)",
            animationDuration: '3s'
          }}>
          CURATED SONGS
        </h1>
        <p className="text-purple-200 text-lg font-[subheading-font]">
          From the curated library, select a song to play
        </p>
      </div>

      {isLoading && (
        <div className="text-center text-white text-xl animate-bounce py-20">
          Loading songs...
        </div>
      )}

      {error && (
        <div className="text-center text-red-300 text-xl py-20">
          Error: {error.message}
        </div>
      )}

      {curatedSongs && curatedSongs.length > 0 && (
        <SongCarousel songs={curatedSongs as any} />
      )}

      {!isLoading && (!curatedSongs || curatedSongs.length === 0) && (
        <div className="text-center text-white text-xl py-20">
          No curated songs found in database
        </div>
      )}
    </div>
  );
}