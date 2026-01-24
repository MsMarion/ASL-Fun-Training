import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { 
  createTRPCRouter,
  publicProcedure
} from "../trpc";

/* ---------- Song Router ---------- */

export const songRouter = createTRPCRouter({
  // Get all songs
  getAll: publicProcedure.query(async () => {
    try {
      const songs = await db.song.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      console.log("Songs fetched from database:", songs.length);
      return songs;
    } catch (error) {
      console.error("Error fetching songs:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch songs",
      });
    }
  }),

});
