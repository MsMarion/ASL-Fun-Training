import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const endpoint = `http://${process.env.LOCAL_STORAGE_ENDPOINT || "localhost:9000"}`;
const bucket = process.env.LOCAL_STORAGE_BUCKET || "signhero";

const s3Client = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.LOCAL_STORAGE_KEY || "admin",
        secretAccessKey: process.env.LOCAL_STORAGE_SECRET || "password",
    },
    forcePathStyle: true,
});

async function uploadSeedAssets() {
  console.log("📤 Migrating Assets to MinIO...");
  
  const assets = [
    {
      localPath: "public/audio/menu-music.mp3",
      remoteKey: "audio/menu-music.mp3",
      contentType: "audio/mpeg"
    },
    {
      localPath: "public/sign-symbols/Plain-svg/A.svg",
      remoteKey: "thumbnails/neon-horizon.svg",
      contentType: "image/svg+xml"
    },
    {
      localPath: "public/sign-symbols/Plain-svg/S.svg",
      remoteKey: "thumbnails/deep-space.svg",
      contentType: "image/svg+xml"
    }
  ];

  for (const asset of assets) {
    try {
      const fullPath = resolve(process.cwd(), asset.localPath);
      const buffer = readFileSync(fullPath);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: asset.remoteKey,
        Body: buffer,
        ContentType: asset.contentType,
      }));
      
      console.log(`✅ Uploaded: ${asset.remoteKey}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${asset.remoteKey}:`, error.message);
    }
  }
}

uploadSeedAssets();
