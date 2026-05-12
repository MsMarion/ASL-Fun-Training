import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SignHero Database...");

  // 1. Clean existing data (Optional, but good for local testing)
  await prisma.song.deleteMany({});
  await prisma.player.deleteMany({});

  // 2. Create a Curated (Official) Song
  const officialSong = await prisma.song.create({
    data: {
      songName: "Neon Horizon",
      albumName: "Synthwave Vol. 1",
      isCommunity: false,
      thumbnailUrl: "thumbnails/neon-horizon.svg",
      audioUrl: "audio/menu-music.mp3",
      interactions: [
        { key: "a", timeElapsed: 2.5 },
        { key: "s", timeElapsed: 4.0 },
        { key: "l", timeElapsed: 5.5 },
        { key: "h", timeElapsed: 7.0 },
        { key: "e", timeElapsed: 8.5 },
        { key: "r", timeElapsed: 10.0 },
        { key: "o", timeElapsed: 11.5 },
      ],
    },
  });

  console.log(`✅ Created Official Song: ${officialSong.songName}`);

  // 3. Create a Community Song
  const communitySong = await prisma.song.create({
    data: {
      songName: "Deep Space Pulse",
      albumName: "Community Beats",
      isCommunity: true,
      thumbnailUrl: "thumbnails/deep-space.svg",
      audioUrl: "audio/menu-music.mp3",
      interactions: [
        { key: "x", timeElapsed: 1.0 },
        { key: "y", timeElapsed: 2.0 },
        { key: "z", timeElapsed: 3.0 },
      ],
    },
  });

  console.log(`✅ Created Community Song: ${communitySong.songName}`);

  // 4. Create a Test Player
  const player = await prisma.player.create({
    data: {
      name: "HeroOne",
      score: 1500,
      avgReactionTime: 0.45,
      mistakesMade: 2,
      correctHits: 45,
      commonMistakes: [
        { key1: "a", key2: "e", hits: 5 },
      ],
    },
  });

  console.log(`✅ Created Test Player: ${player.name}`);

  console.log("🚀 Seeding Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
