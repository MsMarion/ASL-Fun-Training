import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "~/env";

const client = new ElevenLabsClient({
  apiKey: env.ELEVENLABS_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const voiceId = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    const modelId = env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

    const audioStream = await client.textToSpeech.convert(
      voiceId,
      {
        text: text || "Hello, world!",
        modelId: modelId,
        outputFormat: "mp3_44100_128",
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
