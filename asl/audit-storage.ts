import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env manually
dotenv.config({ path: resolve(process.cwd(), ".env") });

const isLocal = process.env.STORAGE_MODE === "local";
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

async function checkMinio() {
  console.log(`🔍 Auditing MinIO at ${endpoint} (Bucket: ${bucket})...`);
  try {
    const command = new ListObjectsV2Command({ Bucket: bucket });
    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log("📂 Bucket is EMPTY. No local assets found.");
    } else {
      console.log(`✅ Found ${response.Contents.length} objects in MinIO:`);
      response.Contents.forEach(obj => {
        console.log(` - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
  } catch (error) {
    console.error("❌ MinIO Connection Failed:", error.message);
    console.log("Tip: Make sure your Docker container is running (docker-compose up -d)");
  }
}

checkMinio();
