import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";

const createEntrySchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name too long"),
    score: z.number().int().min(0, "Score must be non-negative"),
});

export const leaderboardRouter = createTRPCRouter({
    getAll: publicProcedure.query(async () => {
        try {
            const entries = await db.leaderboardEntry.findMany({
                orderBy: {
                    score: "desc",
                },
                take: 100,
            });

            // Assign ranks based on sorted position
            return entries.map((entry, index) => ({
                ...entry,
                rank: index + 1,
            }));
        } catch (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to fetch leaderboard",
            });
        }
    }),

    getTop: publicProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(10) }))
        .query(async ({ input }) => {
            try {
                const entries = await db.leaderboardEntry.findMany({
                    orderBy: {
                        score: "desc",
                    },
                    take: input.limit,
                });

                return entries.map((entry, index) => ({
                    ...entry,
                    rank: index + 1,
                }));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch leaderboard",
                });
            }
        }),

    create: publicProcedure
        .input(createEntrySchema)
        .mutation(async ({ input }) => {
            try {
                // Get current count to determine initial rank
                const count = await db.leaderboardEntry.count();

                const entry = await db.leaderboardEntry.create({
                    data: {
                        name: input.name.toUpperCase(),
                        score: input.score,
                        rank: count + 1, // Temporary rank, will be recalculated on fetch
                    },
                });

                // Get the actual rank for this entry
                const higherScores = await db.leaderboardEntry.count({
                    where: {
                        score: { gt: input.score },
                    },
                });

                return {
                    ...entry,
                    rank: higherScores + 1,
                };
            } catch (error) {
                console.error("Error creating leaderboard entry:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create leaderboard entry",
                });
            }
        }),
});
