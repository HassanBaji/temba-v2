import { TRPCError } from "@trpc/server";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameWaitlist,
  matches,
} from "@repo/db";

import { isPoolTournament } from "~/lib/tournament-rounds";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { isPoolDrawPosted } from "~/server/games/assert-pool-draw-not-posted";
import { leaveRegisteredSeat } from "~/server/games/leave-registered-seat";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function registeredGameTeamId(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  if (!player) {
    return null;
  }
  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
    columns: { gameTeamId: true },
  });
  return link?.gameTeamId ?? null;
}

async function cancelUnplayedPoolMatchesForGameTeam(
  database: DbClient,
  args: { gameId: string; gameTeamId: string },
) {
  const now = new Date();
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(
      and(
        eq(matches.gameId, args.gameId),
        ne(matches.status, MatchStatusEnum.COMPLETED),
        or(
          eq(matches.slot1GameTeamId, args.gameTeamId),
          eq(matches.slot2GameTeamId, args.gameTeamId),
        ),
      ),
    );
}

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
    if (
      isPoolTournament(game.format, game.poolCount) &&
      isPoolDrawPosted(game)
    ) {
      const gameTeamId = await registeredGameTeamId(tx, game.id, userId);
      if (gameTeamId) {
        await cancelUnplayedPoolMatchesForGameTeam(tx, {
          gameId: game.id,
          gameTeamId,
        });
      }
    }
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
