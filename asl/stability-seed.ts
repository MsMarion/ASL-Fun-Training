import { PrismaClient } from "./generated/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function stabilityIngest() {
  console.log("🛠️ Seeding Stability Pack...");

  const levels = [
    { name: "Neon Training (Easy)", diff: "3-4 seconds" },
    { name: "Synthwave Pulse (Medium)", diff: "1-2 seconds" },
    { name: "Cyber Rush (Hard)", diff: "0.5-1 seconds" }
  ];

  const audioPath = resolve(process.cwd(), "public/audio/menu-music.mp3");
  const audioBuffer = readFileSync(audioPath);
  const audioBase64 = audioBuffer.toString("base64");

  for (const level of levels) {
    console.log(`\n🎮 Creating: ${level.name}...`);
    try {
      const prompt = `
        Analyze this audio file and select key words spaced approximately ${level.diff} apart.
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

      await prisma.song.create({
        data: {
          songName: level.name,
          albumName: "Local Starter Pack",
          isCommunity: false,
          audioUrl: "audio/menu-music.mp3",
          thumbnailUrl: "thumbnails/neon-horizon.svg",
          interactions: interactions
        }
      });
      console.log(`✅ Level Created: ${level.name}`);
    } catch (error) {
      console.error(`❌ Failed ${level.name}:`, error.message);
    }
  }
}

stabilityIngest().finally(() => prisma.$disconnect());
