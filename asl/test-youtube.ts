import { Innertube } from "youtubei.js";

async function deepScrutiny() {
  console.log("🔍 Deep Scrutiny of YouTube formats...");
  try {
    const yt = await Innertube.create();
    const info = await yt.getInfo("dQw4w9WgXcQ");
    
    const adaptive = info.streaming_data?.adaptive_formats || [];
    console.log(`\nFound ${adaptive.length} adaptive formats.`);
    
    if (adaptive.length > 0) {
      console.log("\n--- First Format Details ---");
      const f = adaptive[0];
      console.log(JSON.stringify(f, null, 2));
      
      console.log("\n--- Audio Search ---");
      const audioOnly = adaptive.filter(f => f.mime_type.includes("audio/"));
      console.log(`Found ${audioOnly.length} audio-only formats.`);
      audioOnly.forEach((f, i) => {
        console.log(`[${i}] iTag: ${f.itag} | Mime: ${f.mime_type} | Bitrate: ${f.bitrate}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

deepScrutiny();
