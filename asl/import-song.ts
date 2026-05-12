import { PrismaClient } from "./generated/prisma";
import { uploadFile } from "./src/lib/s3";
import { extractVideoId } from "./src/lib/youtube";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const PYTHON_PATH = "C:\\Users\\Deoxon\\.conda\\envs\\asl-v_3\\python.exe";

async function importSong(url: string) {
  if (!url) {
    console.error("❌ Please provide a YouTube URL: npx tsx import-song.ts <URL>");
    process.exit(1);
  }

  console.log(`\n📀 Initializing Bulletproof Import for: ${url}`);
  
  try {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const tempAudioPath = resolve(process.cwd(), `temp_${videoId}`);

    // 1. Call Python Bridge
    console.log(" ⬇️ Downloading via Python Bridge (yt-dlp)...");
    const cmd = `"${PYTHON_PATH}" yt_bridge.py "${url}" "${tempAudioPath}"`;
    
    let rawOutput;
    try {
        rawOutput = execSync(cmd).toString();
    } catch (e) {
        console.error("\n❌ PYTHON BRIDGE FATAL ERROR");
        console.error("---------------------------");
        console.error("Stdout:", e.stdout?.toString());
        console.error("Stderr:", e.stderr?.toString());
        console.error("---------------------------\n");
        process.exit(1);
    }
    
    // Find the JSON block in the output
    let metadata;
    try {
        const jsonMatch = rawOutput.match(/\{"title".*\}/);
        if (!jsonMatch) throw new Error("No JSON found in output");
        metadata = JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("Raw Output:", rawOutput);
        throw new Error(`Failed to parse metadata: ${e.message}`);
    }

    if (metadata.error) throw new Error(metadata.error);

    const actualAudioPath = metadata.filename;
    console.log(` 🎬 Title: ${metadata.title}`);
    console.log(` ⏱️ Duration: ${metadata.duration}s`);
    console.log(` 📂 File: ${actualAudioPath}`);

    // 2. Upload Audio to MinIO
    console.log(" 📤 Uploading Audio to MinIO...");
    const { extname } = await import("path");
    const audioBuffer = readFileSync(actualAudioPath);
    const ext = extname(actualAudioPath).slice(1) || 'webm';
    const audioKey = `audio/${videoId}.${ext}`;
    const contentType = ext === 'm4a' ? 'audio/mp4' : ext === 'webm' ? 'audio/webm' : 'audio/mpeg';
    
    await uploadFile(audioKey, audioBuffer, contentType);
    console.log(` ✅ Audio saved as ${ext}.`);

    // 3. Fetch & Upload Thumbnail
    let thumbnailUrl = "thumbnails/neon-horizon.svg"; 
    if (metadata.thumbnail) {
      console.log(" 🖼️ Fetching Thumbnail...");
      try {
        const thumbRes = await fetch(metadata.thumbnail);
        const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
        thumbnailUrl = `thumbnails/${videoId}.jpg`;
        await uploadFile(thumbnailUrl, thumbBuffer, "image/jpeg");
        console.log(" ✅ Thumbnail saved.");
      } catch (e) {
        console.warn(" ⚠️ Thumbnail failed, using fallback.");
      }
    }

    // 4. Generate Standardized Beatmap (A at 5s intervals)
    console.log(" 🥁 Generating Standardized Beatmap (A @ 5s)...");
    const interactions = [];
    const interval = 5.0;
    for (let time = 5.0; time < metadata.duration - 2; time += interval) {
      interactions.push({
        key: "a",
        timeElapsed: time
      });
    }

    // 5. Save to Database
    console.log(" 💾 Saving to MongoDB...");
    const newSong = await prisma.song.create({
      data: {
        songName: metadata.title,
        albumName: "YouTube Import",
        isCommunity: true,
        audioUrl: audioKey,
        thumbnailUrl: thumbnailUrl,
        interactions: interactions
      }
    });

    // Cleanup
    try { unlinkSync(actualAudioPath); } catch(e) {}

    console.log("\n🚀 IMPORT SUCCESSFUL!");
    console.log(`🔗 ID: ${newSong.id}`);
    console.log(`🌐 Play it at: http://localhost:3000/game/testing/${newSong.id}`);

  } catch (error) {
    console.error(`\n❌ IMPORT FAILED: ${error.message}`);
  }
}

const targetUrl = process.argv[2];
importSong(targetUrl).finally(() => prisma.$disconnect());
