import { spawn } from "child_process";
import { Readable } from "stream";

export interface VideoMetadata {
    title: string;
    duration: number;
}

export function extractVideoId(url: string): string | null {
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

export async function getYtDlpMetadata(videoId: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const ytDlp = spawn("yt-dlp", [
            "--dump-json",
            "--no-playlist",
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let output = "";
        let errorOutput = "";

        ytDlp.stdout.on("data", (chunk) => {
            output += chunk;
        });

        ytDlp.stderr.on("data", (chunk) => {
            errorOutput += chunk;
        });

        ytDlp.on("close", (code) => {
            if (code === 0) {
                try {
                    const data = JSON.parse(output);
                    resolve({
                        title: data.title,
                        duration: data.duration
                    });
                } catch (e) {
                    reject(new Error("Failed to parse metadata JSON"));
                }
            } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${errorOutput}`));
            }
        });

        ytDlp.on("error", (err) => {
            reject(err);
        });
    });
}

export function getAudioStream(videoId: string): { process: any; stream: Readable } {
    const ytDlp = spawn("yt-dlp", [
        "-f", "bestaudio",
        "-o", "-",
        `https://www.youtube.com/watch?v=${videoId}`
    ]);

    return {
        process: ytDlp,
        stream: ytDlp.stdout
    };
}

export async function downloadAudioBuffer(videoId: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const { process, stream } = getAudioStream(videoId);
        const chunks: Buffer[] = [];
        let errorOutput = "";

        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        
        process.stderr.on("data", (chunk: any) => {
            errorOutput += chunk.toString();
        });

        process.on("close", (code: number) => {
            if (code === 0) {
                resolve(Buffer.concat(chunks));
            } else {
                reject(new Error(`yt-dlp download failed: ${errorOutput}`));
            }
        });

        process.on("error", (err: any) => reject(err));
    });
}
