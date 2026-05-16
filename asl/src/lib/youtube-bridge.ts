import { execFileSync } from "child_process";
import { resolve } from "path";
import { readFileSync, unlinkSync } from "fs";
import { extractVideoId } from "./youtube";
import { uploadFile } from "./s3";

export interface YouTubeImportResult {
    success: boolean;
    videoId: string;
    title: string;
    duration: number;
    audioUrl: string;
    thumbnailUrl: string;
    error?: string;
}

export async function bulletproofYoutubeImport(url: string): Promise<YouTubeImportResult> {
    const PYTHON_PATH = process.env.PYTHON_PATH || "python";
    
    try {
        const videoId = extractVideoId(url);
        if (!videoId) throw new Error("Invalid YouTube URL");

        const tempAudioPath = resolve(process.cwd(), `temp_${videoId}`);
        const bridgePath = resolve(process.cwd(), "yt_bridge.py");

        console.log(`[Bridge] Executing: ${PYTHON_PATH} ${bridgePath} [URL] [TEMP_PATH]`);
        
        // Pass arguments directly as an array without shell execution
        const rawOutput = execFileSync(PYTHON_PATH, [bridgePath, url, tempAudioPath], { encoding: "utf8" });
        
        let metadata;
        const jsonMatch = rawOutput.match(/\{"title".*\}/);
        if (!jsonMatch) throw new Error("No JSON found in Python bridge output");
        metadata = JSON.parse(jsonMatch[0]);

        if (metadata.error) throw new Error(metadata.error);
        if (metadata.duration > 360) throw new Error("Song is too long! (Max 6 minutes allowed)");

        const actualAudioPath = metadata.filename;
        const { extname } = await import("path");
        const ext = extname(actualAudioPath).slice(1) || 'webm';
        
        // 1. Upload Audio
        const audioBuffer = readFileSync(actualAudioPath);
        const audioKey = `audio/${videoId}.${ext}`;
        const contentType = ext === 'm4a' ? 'audio/mp4' : ext === 'webm' ? 'audio/webm' : 'audio/mpeg';
        
        const audioUpload = await uploadFile(audioKey, audioBuffer, contentType);
        if (!audioUpload.success) throw new Error(audioUpload.error || "Failed to upload audio");

        // 2. Fetch & Upload Thumbnail
        let thumbnailUrl = "thumbnails/neon-horizon.svg"; 
        if (metadata.thumbnail) {
            try {
                const thumbRes = await fetch(metadata.thumbnail);
                const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
                const thumbKey = `thumbnails/${videoId}.jpg`;
                const thumbUpload = await uploadFile(thumbKey, thumbBuffer, "image/jpeg");
                if (thumbUpload.success) thumbnailUrl = thumbKey;
            } catch (e) {
                console.warn("[Bridge] Thumbnail fetch failed, using fallback.");
            }
        }

        // Cleanup
        try { unlinkSync(actualAudioPath); } catch(e) {}

        return {
            success: true,
            videoId,
            title: metadata.title,
            duration: metadata.duration,
            audioUrl: audioKey,
            thumbnailUrl: thumbnailUrl
        };

    } catch (error) {
        console.error("[Bridge] Fatal Error:", error);
        return {
            success: false,
            videoId: "",
            title: "",
            duration: 0,
            audioUrl: "",
            thumbnailUrl: "",
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
