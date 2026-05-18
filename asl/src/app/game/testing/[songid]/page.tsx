"use client";

/**
 * ============================================================================
 * [ARCHIVED GAMEMODE]: Sign Hero (Testing Mode • /game/testing/[id])
 * ============================================================================
 * Notice: This gamemode is currently archived from public user access to streamline
 * the arcade experience around ASL Revolution and Training Mode.
 * 
 * Purpose: This route was designed as a vertical scrolling reaction assessment mode.
 * Future Roadmap: See `documentation/RHYTHM_ENGINE_UNIFICATION.md` for plans to
 * refactor this vertical note highway layout as a selectable UI skin inside the
 * unified `useGameLoop.ts` engine.
 * ============================================================================
 */

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
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center animate-pulse bg-black/40 backdrop-blur-md border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(45,226,230,0.2)]">
          <div className="text-xl font-mono text-cyan-400 font-bold">Loading Testing Module...</div>
        </div>
      </div>
    );
  }
  if (error || !song) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center bg-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <div className="text-xl font-mono text-red-400 font-bold">Error loading song data</div>
          <p className="text-slate-300 mt-2">{error?.message ?? "Song not found"}</p>
        </div>
      </div>
    );
  }
  if (!isValid || !beatmap) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="text-center bg-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <div className="text-xl font-mono text-red-400 font-bold">Invalid beatmap structure</div>
        </div>
      </div>
    );
  }

  return <TestingCanvas beatmap={beatmap} />;
}
