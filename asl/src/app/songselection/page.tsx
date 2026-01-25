"use client";


import { Navbar } from "@/app/_components/navbar";
import { trpc } from "@/trpc/client";
import { SongCarousel } from "@/app/_components/song-carousel";
import { UnifiedBackground } from "@/app/_components/UnifiedBackground";



// --- Main Component ---
export default function SongSelection() {
  const { data: curatedSongs, isLoading, error } = trpc.song.getOfficialSongs.useQuery();

  return (
    <div className="min-h-screen overflow-hidden relative">
      <UnifiedBackground />

      <div className="relative z-10 flex flex-col items-center justify-start p-8 min-h-screen">
        <Navbar />

        <div className="z-100 relative w-3/4 border-b-1 border-r-1 border-l-1 border-white z-20 px-12 py-16 -translate-y-20 mt-8 rounded-3xl shadow-2xl"
          style={{
            background: "linear-gradient(to bottom, rgba(58,0,102,0.8), rgba(146,0,117,0.8), rgba(58,0,102,0.8))"
          }}>
          <div className="text-center mb-8">
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
            <SongCarousel songs={curatedSongs} />
          )}

          {!isLoading && (!curatedSongs || curatedSongs.length === 0) && (
            <div className="text-center text-white text-xl py-20">
              No curated songs found in database
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Grid animation removed as it's part of SynthwaveBackground now */
      `}</style>
    </div>
  );
}