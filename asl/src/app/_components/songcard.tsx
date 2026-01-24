"use client";

import Link from "next/link";
import { type Song } from "~/types/song";

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  const letterCount = song.interactions.length;
  const duration = song.interactions.length > 0
    ? Math.ceil(song.interactions[song.interactions.length - 1].timeElapsed)
    : 0;

  return (
    <Link
      href={`/game?songId=${song.id}`}
      className="group relative overflow-hidden rounded-lg border-2 transition-all hover:scale-105"
      style={{
        borderColor: "rgba(217,70,239,0.3)",
        background: "rgba(13,8,32,0.6)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="p-6">
        {/* Thumbnail placeholder */}
        <div
          className="mb-4 flex h-32 items-center justify-center rounded-md"
          style={{
            background: "linear-gradient(135deg, rgba(217,70,239,0.2) 0%, rgba(34,211,238,0.2) 100%)",
          }}
        >
          {song.thumbnailName ? (
            <img
              src={`/thumbnails/${song.thumbnailName}`}
              alt={song.songName}
              className="h-full w-full object-cover rounded-md"
            />
          ) : (
            <span className="text-4xl">🎵</span>
          )}
        </div>

        {/* Song info */}
        <h3
          className="font-mono text-lg font-bold mb-1 group-hover:text-purple-400 transition-colors"
          style={{ color: "#e0e7ff" }}
        >
          {song.songName}
        </h3>
        
        <p
          className="text-sm mb-3"
          style={{ color: "rgba(224,231,255,0.6)" }}
        >
          {song.albumName}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div style={{ color: "#d946ef" }}>
            {letterCount} letters
          </div>
          <div style={{ color: "#22d3ee" }}>
            {duration}s
          </div>
          {song.isCommunity && (
            <div
              className="px-2 py-0.5 rounded"
              style={{
                background: "rgba(74,222,128,0.2)",
                color: "#4ade80",
              }}
            >
              Community
            </div>
          )}
        </div>
      </div>

      {/* Hover effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(217,70,239,0.1) 0%, transparent 70%)",
        }}
      />
    </Link>
  );
}