"use client";

import { useParams } from "next/navigation";
import { GameCanvas } from "~/components/game/GameCanvas";
import { getBeatmapById, type Beatmap } from "~/lib/beatmap";
import { db } from "~/server/db";

// Extract S3 key from full DigitalOcean Spaces URL
function extractS3Key(url: string): string | null {
    // URL format: https://{bucket}.{region}.digitaloceanspaces.com/{key}
    const match = url.match(/digitaloceanspaces\.com\/(.+)$/);
    return match?.[1] ?? null;
}

export default async function GamePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Try to fetch song from database
    const song = await db.song.findUnique({
        where: { id },
    }).catch(() => null);

    let beatmap: Beatmap;
    let audioUrl: string | undefined;

    if (song) {
        // Build beatmap from song interactions
        beatmap = {
            title: song.songName,
            notes: song.interactions.map((i) => ({
                time: i.timeElapsed,
                letter: i.key.toUpperCase(),
            })),
            totalDuration: song.interactions.length > 0
                ? song.interactions[song.interactions.length - 1]!.timeElapsed + 3.0
                : 30.0,
        };

        // Convert S3 URL to proxy URL to avoid CORS issues
        if (song.audioUrl) {
            const s3Key = extractS3Key(song.audioUrl);
            audioUrl = s3Key ? `/api/audio/${s3Key}` : undefined;
        }
    } else {
        // Fall back to static beatmap
        beatmap = getBeatmapById(id);
    }

    return <GameCanvas beatmap={beatmap} audioUrl={audioUrl} />;
}