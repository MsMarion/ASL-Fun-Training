import { PrismaClient } from "./generated/prisma";
import { uploadFile, getPublicUrl } from "./src/lib/s3";
import { extractVideoId, getYtDlpMetadata, downloadAudioBuffer } from "./src/lib/youtube";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", // Using a verified model name
    generationConfig: { responseMimeType: "application/json" }
});

const SONGS_TO_INGEST = [
  { url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ", name: "Blinding Lights", album: "After Hours" },
  { url: "https://www.youtube.com/watch?v=8GW6sLrK4Ww", name: "Resonance", album: "Odyssey" },
  { url: "https://www.youtube.com/watch?v=dX3k_UAnyPg", name: "Midnight City", album: "Hurry Up, We're Dreaming" }
];

async function ingestSongs() {
  console.log("🎸 Starting SignHero Mass Ingestion...");

  for (const songInfo of SONGS_TO_INGEST) {
    console.log(`\n📀 Processing: ${songInfo.name}...`);
    try {
      const videoId = extractVideoId(songInfo.url);
      if (!videoId) throw new Error("Invalid URL");

      // 1. Download Audio
      console.log(" ⬇️ Downloading Audio...");
      const audioBuffer = await downloadAudioBuffer(videoId);

      // 2. Upload to MinIO
      console.log(" 📤 Uploading to MinIO...");
      const audioKey = `audio/${videoId}.mp3`;
      await uploadFile(audioKey, audioBuffer, "audio/mpeg");
      const audioUrl = audioKey; // Store key

      // 3. Generate AI Beatmap
      console.log(" 🧠 Generating AI Beatmap (Gemini)...");
      const audioBase64 = audioBuffer.toString("base64");
      const prompt = `
        Analyze this audio file and select key words from the lyrics that are spaced approximately 3-4 seconds apart for a rhythm game.
        Return a JSON array of objects with "word" (string) and "start_time" (number in seconds).
      `;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "audio/mp3", data: audioBase64 } }
      ]);

      const transcription = JSON.parse(result.response.text());
      const interactions = transcription.map((item: any) => ({
        key: item.word.trim().charAt(0).toLowerCase(),
        timeElapsed: item.start_time
      }));

      // 4. Save to Database
      console.log(" 💾 Saving to MongoDB...");
      await prisma.song.create({
        data: {
          songName: songInfo.name,
          albumName: songInfo.album,
          isCommunity: false,
          audioUrl: audioUrl,
          thumbnailUrl: `thumbnails/neon-horizon.svg`, // Re-using local thumb for now
          interactions: interactions
        }
      });

      console.log(`✅ Successfully Ingested: ${songInfo.name}`);
    } catch (error) {
      console.error(`❌ Failed ${songInfo.name}:`, error.message);
    }
  }

  console.log("\n🚀 Mass Ingestion Complete!");
}

ingestSongs()
  .finally(async () => {
    await prisma.$disconnect();
  });
