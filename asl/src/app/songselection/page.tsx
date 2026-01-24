"use client";

import { Navbar } from "@/app/_components/navbar";
import { trpc } from "@/trpc/client";
import { SongCarousel } from "@/app/_components/song-carousel";

export default function SongSelection() {
  const { data: songs, isLoading, error } = trpc.song.getAll.useQuery();

  return (
    <div className="min-h-screen bg-[#0f0a1e] relative overflow-hidden">
      {/* Animated grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(0deg, rgba(45,226,230,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,226,230,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridMove 20s linear infinite",
        }}
      />
      
      {/* Synth wave animated circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '6s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-magenta-500/10 rounded-full blur-3xl animate-pulse" 
           style={{ animationDuration: '5s', animationDelay: '2s' }} />

      <Navbar />
      
      <div className="relative  mx-auto px-4 py-12 bg-[var(--purple)] -translate-y-12 z-100">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-[display-font] text-white mb-4 animate-pulse" 
              style={{ 
                textShadow: "0 0 20px rgba(45,226,230,0.5), 0 0 40px rgba(146,0,117,0.3)",
                animationDuration: '3s'
              }}>
            SONG SELECTION
          </h1>
          <p className="text-purple-200 text-lg font-[subheading-font]">
            From a curated library, select a song to play
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-white text-xl animate-bounce">
            Loading songs...
          </div>
        )}

        {error && (
          <div className="text-center text-red-300 text-xl">
            Error: {error.message}
          </div>
        )}

        {songs && songs.length > 0 && (
          <SongCarousel songs={songs} />
        )}

        {songs && songs.length === 0 && (
          <div className="text-center text-white text-xl">
            No songs found in database
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 40px 40px;
          }
        }
      `}</style>
    </div>
  );
}