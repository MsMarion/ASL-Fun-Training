import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        heroName: z.string().min(2).max(20).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Account with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await db.user.create({
        data: {
          email: input.email,
          displayName: input.heroName ?? input.email.split("@")[0],
          password: hashedPassword,
        },
      });

      return {
        id: user.id,
        name: user.name,
      };
    }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        geminiApiKey: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      // Security Sanitization: Mask sensitive API key when returning profile data over the wire
      geminiApiKey: user.geminiApiKey ? "••••••••••••" + user.geminiApiKey.slice(-4) : null,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        heroName: z.string().min(2).max(20).optional(),
        geminiApiKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: { displayName?: string; geminiApiKey?: string } = {
        displayName: input.heroName,
      };

      // Only update API key if a brand new unmasked key was provided
      if (input.geminiApiKey && !input.geminiApiKey.startsWith("••••••••••••")) {
        updateData.geminiApiKey = input.geminiApiKey;
      }

      return db.user.update({
        where: { id: ctx.session.user.id },
        data: updateData,
      });
    }),
});
