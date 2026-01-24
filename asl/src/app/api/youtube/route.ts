import { NextResponse } from "next/server";
import { extractVideoId, getYtDlpMetadata, getAudioStream } from "~/lib/youtube";

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

        // Get video metadata using yt-dlp
        const metadata = await getYtDlpMetadata(videoId);
        
        console.log("Video title:", metadata.title);

        return NextResponse.json({
            success: true,
            videoId,
            title: metadata.title,
            duration: metadata.duration,
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

        // Create a ReadableStream from yt-dlp stdout
        const stream = new ReadableStream({
            start(controller) {
                const { process: ytDlp, stream: stdOut } = getAudioStream(videoId);

                stdOut.on("data", (chunk) => {
                    controller.enqueue(chunk);
                });

                stdOut.on("end", () => {
                    controller.close();
                });

                ytDlp.stderr.on("data", (data: any) => {
                    // Log stderr but don't fail immediately unless process exits with error
                    // yt-dlp prints progress to stderr
                    const msg = data.toString();
                    if (!msg.includes("[download]") && !msg.includes("[youtube]")) {
                        console.error("yt-dlp stderr:", msg);
                    }
                });

                ytDlp.on("error", (err: any) => {
                    controller.error(err);
                });

                ytDlp.on("close", (code: number) => {
                    if (code !== 0) {
                        console.error(`yt-dlp exited with code ${code}`);
                        // If we haven't closed yet, we could error, but stream might be partially sent.
                        // Controller close is handled in stdout.end
                    }
                });
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "audio/webm",
                "Cache-Control": "no-cache",
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

