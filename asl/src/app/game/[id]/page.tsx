import { GameCanvas } from "~/components/game/GameCanvas";
import { getBeatmapById } from "~/lib/beatmap";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beatmap = getBeatmapById(id);
  return <GameCanvas beatmap={beatmap} />;
}
