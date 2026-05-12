import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    STORAGE_MODE: z.enum(["local", "cloud"]).default("local"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // DigitalOcean Spaces (S3-compatible)
    DO_SPACES_KEY: z.string().optional(),
    DO_SPACES_SECRET: z.string().optional(),
    DO_SPACES_ENDPOINT: z.string().optional(),
    DO_SPACES_BUCKET: z.string().optional(),
    DO_SPACES_REGION: z.string().default("nyc3"),

    // Local MinIO
    LOCAL_STORAGE_KEY: z.string().optional(),
    LOCAL_STORAGE_SECRET: z.string().optional(),
    LOCAL_STORAGE_ENDPOINT: z.string().optional(),
    LOCAL_STORAGE_BUCKET: z.string().optional(),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it can't be a opt. url().
      process.env.VERCEL_URL ? z.string() : z.string().url()
    ),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_MODE: process.env.STORAGE_MODE,
    NODE_ENV: process.env.NODE_ENV,
    DO_SPACES_KEY: process.env.DO_SPACES_KEY,
    DO_SPACES_SECRET: process.env.DO_SPACES_SECRET,
    DO_SPACES_ENDPOINT: process.env.DO_SPACES_ENDPOINT,
    DO_SPACES_BUCKET: process.env.DO_SPACES_BUCKET,
    DO_SPACES_REGION: process.env.DO_SPACES_REGION,
    LOCAL_STORAGE_KEY: process.env.LOCAL_STORAGE_KEY,
    LOCAL_STORAGE_SECRET: process.env.LOCAL_STORAGE_SECRET,
    LOCAL_STORAGE_ENDPOINT: process.env.LOCAL_STORAGE_ENDPOINT,
    LOCAL_STORAGE_BUCKET: process.env.LOCAL_STORAGE_BUCKET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
