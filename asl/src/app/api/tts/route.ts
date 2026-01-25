import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text, voiceId, voice_settings } = await request.json();

    const audioStream = await client.textToSpeech.convert(
      voiceId || "u54BhqspOGypiSHU4kHk", // Default to George voice ID
      {
        text: text || "Hello, world!",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        voiceSettings: voice_settings,
      }
    );

    // Collect chunks from the async iterator
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream as any) {
      chunks.push(chunk);
    }

    // Combine chunks into a single buffer
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
