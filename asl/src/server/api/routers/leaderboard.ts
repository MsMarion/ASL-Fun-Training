import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";

const createEntrySchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name too long"),
    score: z.number().int().min(0, "Score must be non-negative"),
    playerId: z.string().optional(),
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
                const count = await db.leaderboardEntry.count();

                const entry = await db.leaderboardEntry.create({
                    data: {
                        name: input.name.toUpperCase(),
                        score: input.score,
                        rank: count + 1,
                        playerId: input.playerId,
                    },
                });

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

    upsert: publicProcedure
        .input(createEntrySchema)
        .mutation(async ({ input }) => {
            try {
                const normalizedName = input.name.toUpperCase();

                // CRITICAL: Use playerId to find existing entry if provided
                // This prevents duplicate entries for the same player
                const existingEntry = input.playerId 
                    ? await db.leaderboardEntry.findFirst({
                        where: { playerId: input.playerId },
                      })
                    : await db.leaderboardEntry.findFirst({
                        where: { name: normalizedName },
                      });

                let entry;

                if (existingEntry) {
                    // Entry exists - only update if new score is higher
                    if (input.score > existingEntry.score) {
                        entry = await db.leaderboardEntry.update({
                            where: { id: existingEntry.id },
                            data: {
                                score: input.score,
                                name: normalizedName,
                            },
                        });
                        console.log(`✅ Updated ${normalizedName}: ${existingEntry.score} → ${input.score}`);
                    } else {
                        entry = existingEntry;
                        console.log(`ℹ️  Kept high score for ${normalizedName}: ${existingEntry.score}`);
                    }
                } else {
                    // New entry
                    const count = await db.leaderboardEntry.count();
                    
                    entry = await db.leaderboardEntry.create({
                        data: {
                            name: normalizedName,
                            score: input.score,
                            rank: count + 1,
                            playerId: input.playerId,
                        },
                    });
                    console.log(`✅ Created new entry for ${normalizedName}: ${input.score}`);
                }

                const higherScores = await db.leaderboardEntry.count({
                    where: {
                        score: { gt: entry.score },
                    },
                });

                return {
                    ...entry,
                    rank: higherScores + 1,
                };
            } catch (error) {
                console.error("Error upserting leaderboard entry:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to upsert leaderboard entry",
                });
            }
        }),
});