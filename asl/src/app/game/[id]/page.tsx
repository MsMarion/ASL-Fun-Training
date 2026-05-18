"use client";

import { useParams } from "next/navigation";
import { GameCanvas } from "~/components/game/GameCanvas";
import { api } from "~/trpc/react";
import { songToBeatmap, validateBeatmap } from "~/lib/beatmapUtils";
import { DEMO_BEATMAP } from "~/lib/beatmap";

export default function GamePage() {
  const params = useParams();
  const songId = params.id as string;

  // Fetch the song data
  const { data: song, isLoading, error } = api.song.getById.useQuery(
    { id: songId },
    { enabled: !!songId }
  );

  // Convert song to beatmap (no fallback to demo in dynamic route)
  const beatmap = song ? songToBeatmap(song) : null;

  // Validate the beatmap
  const isValid = beatmap ? validateBeatmap(beatmap) : false;

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
        <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 text-center bg-black/50 backdrop-blur-md animate-pulse">
          <div className="mb-4 text-4xl animate-spin">🎵</div>
          <div className="text-xl font-mono text-cyan-300 font-bold tracking-wider">
            LOADING SONG...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
        <div className="glass-panel p-8 rounded-3xl border border-red-500/50 text-center bg-black/50 backdrop-blur-md">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono text-red-400 font-bold tracking-wider">
            FAILED TO LOAD SONG
          </div>
          <div className="mt-2 text-sm text-red-300/80 font-mono">
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
        <div className="glass-panel p-8 rounded-3xl border border-red-500/50 text-center bg-black/50 backdrop-blur-md">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono text-red-400 font-bold tracking-wider">
            INVALID BEATMAP DATA
          </div>
        </div>
      </div>
    );
  }

  return <GameCanvas beatmap={beatmap} />;
}
