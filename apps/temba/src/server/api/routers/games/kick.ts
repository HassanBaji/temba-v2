import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gameWaitlist } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { leaveRegisteredSeat } from "~/server/games/leave-registered-seat";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function kick(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    userId?: string;
    waitlistId?: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);
  if (args.waitlistId) {
    const deleted = await database
      .delete(gameWaitlist)
      .where(
        and(
          eq(gameWaitlist.id, args.waitlistId),
          eq(gameWaitlist.gameId, game.id),
        ),
      )
      .returning({ id: gameWaitlist.id });
    if (deleted.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Waitlist entry not found",
      });
    }
    return { ok: true as const };
  }
  if (!args.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Kick a registered User or a waitlist entry",
    });
  }
  const userId = args.userId;
  await database.transaction(async (tx) => {
    await leaveRegisteredSeat(
      tx,
      game,
      userId,
      "That User is not registered on this Game",
    );
  });
  return { ok: true as const };
}

export const kickProcedure = protectedProcedure
  .input(
    z
      .object({
        gameId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        waitlistId: z.string().uuid().optional(),
      })
      .refine((value) => Boolean(value.userId) !== Boolean(value.waitlistId), {
        message: "Kick a registered User or a waitlist entry",
      }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return kick(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      userId: input.userId,
      waitlistId: input.waitlistId,
    });
  });
