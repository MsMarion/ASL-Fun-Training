"use client";

import { useParams } from "next/navigation";
import { TestingCanvas } from "~/components/game/TestingCanvas";
import { api } from "~/trpc/react";
import { songToBeatmap, validateBeatmap } from "~/lib/beatmapUtils";

export default function TestingPage() {
  const params = useParams();
  const songId = params.songid as string;

  const { data: song, isLoading, error } = api.song.getById.useQuery(
    { id: songId },
    { enabled: !!songId }
  );

  const beatmap = song ? songToBeatmap(song) : null;
  const isValid = beatmap ? validateBeatmap(beatmap) : false;

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🎸</div>
          <div className="text-xl font-mono text-[#2de2e6]">
            Loading Sign Hero...
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-red-500">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono">Error loading song</div>
          {error && <div className="text-sm mt-2">{error.message}</div>}
        </div>
      </div>
    );
  }

  if (!isValid || !beatmap) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-red-500">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <div className="text-xl font-mono">Invalid Beatmap</div>
        </div>
      </div>
    );
  }

  return <TestingCanvas beatmap={beatmap} category="signhero" />;
}