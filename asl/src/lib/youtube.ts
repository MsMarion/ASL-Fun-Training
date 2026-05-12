import { Innertube } from "youtubei.js";

export interface VideoMetadata {
    title: string;
    duration: number;
    thumbnailUrl?: string;
}

export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.be\/([^&\n?#]+)/,
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

/**
 * Get video metadata using youtubei.js
 */
export async function getYtDlpMetadata(videoId: string): Promise<VideoMetadata> {
    const yt = await Innertube.create();
    const info = await yt.getInfo(videoId);
    
    return {
        title: info.basic_info.title || "Unknown Title",
        duration: info.basic_info.duration || 0,
        thumbnailUrl: info.basic_info.thumbnail?.[0]?.url
    };
}

/**
 * Download audio buffer using youtubei.js
 */
export async function downloadAudioBuffer(videoId: string): Promise<Buffer> {
    const yt = await Innertube.create();
    const info = await yt.getInfo(videoId);
    
    // Manual format selection to be more resilient
    const adaptive = info.streaming_data?.adaptive_formats || [];
    const audioFormats = adaptive.filter(f => f.mime_type.includes("audio/"));
    
    if (audioFormats.length === 0) {
        throw new Error("No audio formats found for this video");
    }

    // Pick the best bitrate audio
    const format = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    const stream = await info.download({ format });
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
}

/**
 * Legacy compatibility for streaming
 */
export async function getAudioStream(videoId: string) {
    const buffer = await downloadAudioBuffer(videoId);
    const { Readable } = await import("stream");
    return {
        process: { on: () => {}, stderr: { on: () => {} } }, 
        stream: Readable.from(buffer)
    };
}
