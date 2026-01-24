import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { downloadAudioBuffer } from "~/lib/youtube";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Configure the model
const model = genAI ? genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json"
    }
}) : null;

export async function POST(request: Request) {
    if (!genAI || !model) {
        return NextResponse.json(
            { success: false, error: "GEMINI_API_KEY is not configured" },
            { status: 500 }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const videoId = formData.get("videoId") as string | null;

        let audioBuffer: Buffer;

        // 1. Get the audio buffer
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuffer);
        } else if (videoId) {
            console.log("Downloading audio for video:", videoId);
            audioBuffer = await downloadAudioBuffer(videoId);
        } else {
            return NextResponse.json(
                { success: false, error: "No audio file or video ID provided" },
                { status: 400 }
            );
        }

        // 2. Transcribe with Gemini
        // Convert to base64
        const audioBase64 = audioBuffer.toString("base64");

        const prompt = `
            Analyze this audio file and select key words from the lyrics that are spaced approximately 2-3 seconds apart.
            Do NOT transcribe every single word.
            Pick significant words that fairly represent the flow of the song, but ensure there is a gap of roughly 2 to 3 seconds between each selected word's start time.

            Return a JSON array where each object has:
            - "word": The word spoken (string)
            - "start_time": The start time of the word in seconds (number)
            
            Strictly follow this JSON schema:
            [
              { "word": "Hello", "start_time": 0.5 },
              { "word": "world", "start_time": 3.2 }
            ]
            
            Ensure coverage of the entire song duration.
        `;

        console.log("Sending to Gemini...");
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/mp3",
                    data: audioBase64
                }
            }
        ]);

        const response = result.response;
        const text = response.text();
        
        console.log("Gemini response length:", text.length);

        // 3. Parse and Format
        let transcription = JSON.parse(text);
        
        // Handle potential nested wrapper if the model adds one
        if (!Array.isArray(transcription) && transcription.words) {
            transcription = transcription.words;
        }

        const interactions = transcription.map((item: any) => ({
            key: item.word.trim().charAt(0),
            timeElapsed: item.start_time
        }));

        return NextResponse.json({
            success: true,
            interactions
        });

    } catch (error) {
        console.error("Transcription error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: `Transcription failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
