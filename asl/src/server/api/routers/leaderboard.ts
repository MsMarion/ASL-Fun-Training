import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";

const createEntrySchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name too long"),
    score: z.number().int().min(0, "Score must be non-negative"),
    playerId: z.string().optional(),
    category: z.string().min(1), // Required: "training", "guitar-hero", "just-dance", etc.
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
        .input(z.object({ 
            limit: z.number().int().min(1).max(100).default(10),
            category: z.string().optional(), // Optional: filter by category
        }))
        .query(async ({ input }) => {
            try {
                const entries = await db.leaderboardEntry.findMany({
                    where: input.category ? { category: input.category } : undefined,
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

    getByCategory: publicProcedure
        .input(z.object({ 
            category: z.string(),
            limit: z.number().int().min(1).max(100).default(10),
        }))
        .query(async ({ input }) => {
            try {
                const entries = await db.leaderboardEntry.findMany({
                    where: { category: input.category },
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
                    message: "Failed to fetch leaderboard by category",
                });
            }
        }),

    create: publicProcedure
        .input(createEntrySchema)
        .mutation(async ({ input }) => {
            try {
                const count = await db.leaderboardEntry.count({
                    where: { category: input.category },
                });

                const entry = await db.leaderboardEntry.create({
                    data: {
                        name: input.name.toUpperCase(),
                        score: input.score,
                        rank: count + 1,
                        playerId: input.playerId,
                        category: input.category,
                    },
                });

                const higherScores = await db.leaderboardEntry.count({
                    where: {
                        category: input.category,
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

                // CRITICAL: Use playerId AND category to find existing entry if provided
                // This prevents duplicate entries for the same player in the same category
                const existingEntry = input.playerId 
                    ? await db.leaderboardEntry.findFirst({
                        where: { 
                            playerId: input.playerId,
                            category: input.category,
                        },
                      })
                    : await db.leaderboardEntry.findFirst({
                        where: { 
                            name: normalizedName,
                            category: input.category,
                        },
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
                        console.log(`✅ Updated ${normalizedName} (${input.category}): ${existingEntry.score} → ${input.score}`);
                    } else {
                        entry = existingEntry;
                        console.log(`ℹ️  Kept high score for ${normalizedName} (${input.category}): ${existingEntry.score}`);
                    }
                } else {
                    // New entry
                    const count = await db.leaderboardEntry.count({
                        where: { category: input.category },
                    });
                    
                    entry = await db.leaderboardEntry.create({
                        data: {
                            name: normalizedName,
                            score: input.score,
                            rank: count + 1,
                            playerId: input.playerId,
                            category: input.category,
                        },
                    });
                    console.log(`✅ Created new entry for ${normalizedName} (${input.category}): ${input.score}`);
                }

                const higherScores = await db.leaderboardEntry.count({
                    where: {
                        category: input.category,
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