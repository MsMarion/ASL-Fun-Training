import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

async function manualSeed() {
  console.log("🎮 Seeding SignHero Pro Pack (Manual Beatmaps)...");

  const songs = [
    {
      name: "Neon Horizon (Easy)",
      diff: 3.0,
      keys: "aslhero"
    },
    {
      name: "Synthwave Pulse (Medium)",
      diff: 1.5,
      keys: "abcdefg"
    },
    {
      name: "Cyber Rush (Hard)",
      diff: 0.8,
      keys: "qwertyuiop"
    }
  ];

  for (const song of songs) {
    const interactions = [];
    let currentTime = 2.0; // Start at 2 seconds
    
    // Generate 30 interactions for each song
    for (let i = 0; i < 30; i++) {
      interactions.push({
        key: song.keys[i % song.keys.length],
        timeElapsed: currentTime
      });
      currentTime += song.diff;
    }

    await prisma.song.create({
      data: {
        songName: song.name,
        albumName: "Local Pro Pack",
        isCommunity: false,
        audioUrl: "audio/menu-music.mp3",
        thumbnailUrl: "thumbnails/neon-horizon.svg",
        interactions: interactions
      }
    });
    console.log(`✅ Created: ${song.name}`);
  }
}

manualSeed().finally(() => prisma.$disconnect());
