import { listFiles } from "./src/lib/s3";

async function checkMinio() {
  console.log("🔍 Checking MinIO Bucket Content...");
  try {
    const files = await listFiles();
    if (files.length === 0) {
      console.log("📂 Bucket is EMPTY.");
    } else {
      console.log(`✅ Found ${files.length} files in MinIO:`);
      files.forEach(f => console.log(` - ${f.key} (${f.size} bytes)`));
    }
  } catch (error) {
    console.error("❌ Error connecting to MinIO:", error);
  }
}

checkMinio();
