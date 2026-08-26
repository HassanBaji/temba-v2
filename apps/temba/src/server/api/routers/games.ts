import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { communities, games, groups } from "@repo/db";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const gamesRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  /**
   * Live public pickup Games. Soft-archived Community Club Group Games are
   * excluded from this listing; the Game `isPublic` row flag is not flipped.
   */
  listPublicPickup: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: games.id,
        name: games.name,
        isPublic: games.isPublic,
        groupId: games.groupId,
        startTime: games.startTime,
        endTime: games.endTime,
        sport: games.sport,
        status: games.status,
        createdAt: games.createdAt,
      })
      .from(games)
      .leftJoin(groups, eq(games.groupId, groups.id))
      .leftJoin(communities, eq(groups.communityId, communities.id))
      .where(
        and(
          eq(games.isPublic, true),
          or(isNull(communities.id), isNull(communities.archivedAt)),
        ),
      )
      .orderBy(games.startTime);

    return rows;
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
