"use client";

import { Navbar } from "@/app/_components/navbar";
import { trpc } from "@/trpc/client";
import { SongCarousel } from "@/app/_components/song-carousel";

export default function SongSelection() {
  // Fetch all songs using tRPC
  const { data: songs, isLoading, error } = trpc.song.getAll.useQuery();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-800 to-purple-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Select Your Song
          </h1>
          <p className="text-purple-200">
            Choose a song to play
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-white text-xl">
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
    </div>
  );
}