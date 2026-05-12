import { S3Client, CreateBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import { resolve } from "path";

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

async function initBucket() {
  console.log(`🏗️ Initializing MinIO Bucket: ${bucket}...`);
  try {
    // 1. Create Bucket
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`✅ Bucket '${bucket}' created successfully.`);

    // 2. Set Public Read Policy (so browser can access images/audio)
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicRead",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }));
    console.log(`✅ Public-Read policy applied to '${bucket}'.`);

  } catch (error) {
    if (error.name === "BucketAlreadyOwnedByYou" || error.name === "BucketAlreadyExists") {
      console.log(`ℹ️ Bucket '${bucket}' already exists.`);
    } else {
      console.error("❌ Initialization Failed:", error.message);
    }
  }
}

initBucket();
