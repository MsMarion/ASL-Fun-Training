import { NextResponse } from "next/server";
import { bulletproofYoutubeImport } from "~/lib/youtube-bridge";
import { getAudioStream } from "~/lib/youtube";

// POST - Get video info, download audio, and upload to MinIO
export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { success: false, error: "URL is required" },
                { status: 400 }
            );
        }

        console.log("🎬 Initializing Bulletproof Import for:", url);
        const result = await bulletproofYoutubeImport(url);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json(result);

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
            async start(controller) {
                try {
                    const { process: ytDlp, stream: stdOut } = await getAudioStream(videoId);

                    stdOut.on("data", (chunk: any) => {
                        controller.enqueue(chunk);
                    });

                    stdOut.on("end", () => {
                        controller.close();
                    });

                    ytDlp.stderr.on("data", (data: any) => {
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
                        }
                    });
                } catch (err) {
                    controller.error(err);
                }
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

