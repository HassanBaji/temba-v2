import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { gameListTime, isGameLive } from "~/server/home/upcoming-games";

export const gamesRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  /**
   * Public pickup Games (parent events). Soft-archived Community Club Group
   * Games are excluded; the Game `isPublic` row flag is not flipped.
   * Groupless public Games are included.
   */
  listPublicPickup: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.games.findMany({
      where: and(eq(games.isPublic, true), isNull(games.cancelledAt)),
      columns: {
        id: true,
        name: true,
        isPublic: true,
        groupId: true,
        windowStart: true,
        windowEnd: true,
        cancelledAt: true,
        createdAt: true,
        format: true,
        sport: true,
      },
      with: {
        group: {
          columns: {
            id: true,
            communityId: true,
          },
          with: {
            community: {
              columns: {
                archivedAt: true,
              },
            },
          },
        },
        matches: {
          columns: {
            startTime: true,
            status: true,
          },
        },
      },
    });

    const now = new Date();

    return rows
      .filter((row) => row.group?.community?.archivedAt == null)
      .map((row) => {
        const candidate = {
          id: row.id,
          groupId: row.groupId,
          cancelledAt: row.cancelledAt,
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
          createdAt: row.createdAt,
          format: row.format,
          matches: row.matches,
        };
        return {
          id: row.id,
          name: row.name,
          isPublic: row.isPublic,
          groupId: row.groupId,
          startTime: gameListTime(candidate),
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
          sport: row.sport,
          format: row.format,
          createdAt: row.createdAt,
          live: isGameLive(candidate, now),
        };
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // await ctx.db.insert(posts).values({
      //   name: input.name,
      //   createdById: ctx.userId,
      // });
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
