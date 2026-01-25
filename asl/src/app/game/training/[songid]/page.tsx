"use client";

import { useParams } from "next/navigation";
import { TrainingCanvas } from "~/components/game/TrainingCanvas";
import { api } from "~/trpc/react";
import { songToBeatmap, validateBeatmap } from "~/lib/beatmapUtils";

export default function TrainingPage() {
  const params = useParams();
  const songId = params.songid as string;

  // Fetch the song data
  const { data: song, isLoading, error } = api.song.getById.useQuery(
    { id: songId },
    { enabled: !!songId }
  );

  // Convert song to beatmap
  const beatmap = song ? songToBeatmap(song) : null;
  const isValid = beatmap ? validateBeatmap(beatmap) : false;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="text-center animate-pulse">
           <div className="text-xl font-mono text-cyan-400">
            Loading Training Module...
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="text-center">
           <div className="text-xl font-mono text-red-400">
            Error loading song data
          </div>
          <p className="text-slate-500 mt-2">{error?.message ?? "Song not found"}</p>
        </div>
      </div>
    );
  }

  if (!isValid || !beatmap) {
      return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="text-center">
           <div className="text-xl font-mono text-red-400">
            Invalid beatmap
          </div>
        </div>
      </div>
    );
  }

  return <TrainingCanvas beatmap={beatmap} />;
}
