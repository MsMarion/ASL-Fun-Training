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

  if (isLoading) return <div className="h-full w-full bg-black flex items-center justify-center text-white">Loading...</div>;
  if (error || !song) return <div className="h-full w-full bg-black flex items-center justify-center text-red-500">Error loading song</div>;
  if (!isValid || !beatmap) return <div className="h-full w-full bg-black flex items-center justify-center text-red-500">Invalid Beatmap</div>;

  return <TestingCanvas beatmap={beatmap} />;
}
