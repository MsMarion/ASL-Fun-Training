import { NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";

let innertube: Innertube | null = null;

async function getInnertube() {
    if (!innertube) {
        innertube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
        });
    }
    return innertube;
}

// POST - Get video info and return videoId for streaming
export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { success: false, error: "URL is required" },
                { status: 400 }
            );
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Invalid YouTube URL" },
                { status: 400 }
            );
        }

        console.log("Processing video:", videoId);

        const yt = await getInnertube();
        const info = await yt.getBasicInfo(videoId);
        const title = info.basic_info.title || videoId;
        const duration = info.basic_info.duration || 0;

        console.log("Video title:", title);

        // Always use stream endpoint - it's more reliable
        return NextResponse.json({
            success: true,
            videoId,
            title,
            duration,
        });

    } catch (error) {
        console.error("YouTube API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: `Failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}

// GET - Stream the audio
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get("videoId");

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: "Video ID required" },
                { status: 400 }
            );
        }

        console.log("Streaming video:", videoId);

        const yt = await getInnertube();
        const info = await yt.getInfo(videoId);

        // Get audio stream using the built-in download method
        const stream = await info.download({
            type: "audio",
            quality: "best",
        });

        // Collect stream chunks
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        console.log("Stream complete, size:", buffer.length);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/webm",
                "Content-Length": buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error("Stream error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: `Stream failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}

function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}
