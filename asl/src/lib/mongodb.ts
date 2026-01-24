import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://db_user:yQga3W75DKTgG77m@asl.dk10qhb.mongodb.net/ASL?retryWrites=true&w=majority&appName=ASL";

if (!MONGODB_URI) {
  throw new Error("Please define the DATABASE_URL environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
