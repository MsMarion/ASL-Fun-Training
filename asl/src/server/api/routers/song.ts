import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { 
  createTRPCRouter,
  publicProcedure
} from "../trpc";

import { z } from "zod";

const createSongSchema = z.object({
  songName: z.string().min(1, "Song name is required").max(200, "Song name too long"),
  albumName: z.string().min(1, "Album name is required").max(200, "Album name too long"),
  thumbnailName: z.string().optional(),
  interactions: z.array(
    // TODO: we have to figure out how the devmode form for the set works
    z.object({
      key: z.string().min(1, "Interaction key is required"),
      timeElapsed: z.number().min(0, "Time elapsed must be non-negative"),
    })
  ).optional().default([]),
});

export const songRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    try {
      const songs = await db.song.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      return songs;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch songs",
      });
    }
  }),

  create: publicProcedure
    .input(createSongSchema)
    .mutation(async ({ input }) => {
      try {
        const song = await db.song.create({
          data: {
            songName: input.songName,
            albumName: input.albumName,
            thumbnailName: input.thumbnailName,
            // TODO: we have to figure out how the devmode form for the set works
            // interactions: input.interactions, 
          },
        });
        return song;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create song",
        });
      }
    }),

});
