"use client";

import { useState } from "react";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
    apiKey: "sk_047f6a4749901f9749fcd5253b92c75112c05b09ae616e62"
});

export function ElevenLabsDemo() {
    const [isLoading, setIsLoading] = useState(false);

    const playAudio = async () => {
        setIsLoading(true);
        try {
            const audioStream = await elevenlabs.textToSpeech.convert(
                "TxGEqnHWrfWFTfGW9XjX", // Josh - American male
                {
                    text: "PERFECT!",
                    modelId: "eleven_multilingual_v2",
                    outputFormat: "mp3_44100_128",
                    voiceSettings: {
                        stability: 0.3,
                        speed: 1.1,
                        similarityBoost: 0.75,
                        style: 0.8,
                        useSpeakerBoost: true,
                    },
                }
            );

            // Collect chunks from the stream
            const chunks: Uint8Array[] = [];
            const reader = audioStream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            // Create blob and play
            const audioBlob = new Blob(chunks, { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4 border rounded bg-white/10">
            <h2 className="text-xl font-bold">ElevenLabs Demo</h2>
            <p>hello swamp hacks!!</p>
            <button
                onClick={playAudio}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {isLoading ? "Loading..." : "Mi Button"}
            </button>
        </div>
    );
}
