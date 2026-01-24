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
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: "#0d0820" }}>
        <div className="text-center">
          <div className="mb-4 text-4xl">🎵</div>
          <div className="text-xl font-mono" style={{ color: "#e0e7ff" }}>
            Loading song...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: "#0d0820" }}>
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono text-red-400">
            Failed to load song
          </div>
          <div className="mt-2 text-sm" style={{ color: "#e0e7ff" }}>
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: "#0d0820" }}>
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono text-red-400">
            Invalid beatmap data
          </div>
        </div>
      </div>
    );
  }

  return <GameCanvas beatmap={beatmap} />;
}