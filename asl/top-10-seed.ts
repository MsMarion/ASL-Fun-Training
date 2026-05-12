import "dotenv/config";
import { bulletproofYoutubeImport } from "./src/lib/youtube-bridge";
import { PrismaClient } from "./generated/prisma";
import { resolve } from "path";
const prisma = new PrismaClient();

const TOP_SONGS = [
    "https://www.youtube.com/watch?v=kJQP7kiw5Fk", // Despacito
    "https://www.youtube.com/watch?v=JGwWNGJdvx8", // Shape of You
    "https://www.youtube.com/watch?v=OPf0YbXqDm0", // Uptown Funk
    "https://www.youtube.com/watch?v=7wtfhZwyrAY", // Believer
    "https://www.youtube.com/watch?v=2Vv-BfVoq4g", // Perfect
    "https://www.youtube.com/watch?v=09R8_2nJtjg", // Sugar
    "https://www.youtube.com/watch?v=CevxZvSJLk8", // Roar
    "https://www.youtube.com/watch?v=hT_nvWreIhg", // Counting Stars
    "https://www.youtube.com/watch?v=ktvTqknDobU", // Radioactive
    "https://www.youtube.com/watch?v=lp-EO5I6OHY", // Thinking Out Loud
];

async function seedTop10() {
    console.log("🌟 Seeding Top 10 YouTube Hits...");
    
    for (const url of TOP_SONGS) {
        try {
            console.log(`\n🚀 Processing: ${url}`);
            const result = await bulletproofYoutubeImport(url);
            
            if (result.success) {
                // Create standardized beatmap (A @ 5s)
                const interactions = [];
                const interval = 5.0;
                for (let time = 5.0; time < result.duration - 2; time += interval) {
                    interactions.push({
                        key: "a",
                        timeElapsed: time
                    });
                }

                await prisma.song.create({
                    data: {
                        songName: result.title,
                        albumName: "YouTube Hits",
                        isCommunity: true,
                        audioUrl: result.audioUrl,
                        thumbnailUrl: result.thumbnailUrl,
                        interactions: interactions
                    }
                });
                console.log(`✅ Successfully imported: ${result.title}`);
            } else {
                console.error(`❌ Failed to import ${url}: ${result.error}`);
            }
        } catch (e) {
            console.error(`❌ Fatal error for ${url}:`, e.message);
        }
    }
}

seedTop10().finally(() => prisma.$disconnect());
