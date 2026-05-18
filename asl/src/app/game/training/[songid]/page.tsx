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
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center animate-pulse bg-black/40 backdrop-blur-md border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(45,226,230,0.2)]">
           <div className="text-xl font-mono text-cyan-400 font-bold">
            Loading Training Module...
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center bg-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
           <div className="text-xl font-mono text-red-400 font-bold">
            Error loading song data
          </div>
          <p className="text-slate-300 mt-2">{error?.message ?? "Song not found"}</p>
        </div>
      </div>
    );
  }

  if (!isValid || !beatmap) {
      return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center bg-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
           <div className="text-xl font-mono text-red-400 font-bold">
            Invalid beatmap
          </div>
        </div>
      </div>
    );
  }

  return <TrainingCanvas beatmap={beatmap} />;
}
