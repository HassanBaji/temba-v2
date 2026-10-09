import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameWaitlist,
  matches,
} from "@repo/db";

import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { isPoolDrawPosted } from "#src/games/assert-pool-draw-not-posted";
import { placeKnockoutQualifiers } from "#src/games/knockout-advance";
import { leaveRegisteredSeat } from "#src/games/leave-registered-seat";
import { notifyIfGameFinished } from "#src/notifications/notify-game-finished";

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
  const cancelled = await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(
      and(
        eq(matches.gameId, args.gameId),
        isNull(matches.knockoutRound),
        ne(matches.status, MatchStatusEnum.COMPLETED),
        or(
          eq(matches.slot1GameTeamId, args.gameTeamId),
          eq(matches.slot2GameTeamId, args.gameTeamId),
        ),
      ),
    )
    .returning({ id: matches.id });
  return cancelled.length > 0;
}

/**
 * Leaves the Game team's place in each unsettled Knockout Match empty; the
 * Organizer resolves that Match by cancelling it as a Walkover.
 */
async function vacateUnplayedKnockoutSlotsForGameTeam(
  database: DbClient,
  args: { gameId: string; gameTeamId: string },
) {
  const now = new Date();
  const unsettledKnockout = and(
    eq(matches.gameId, args.gameId),
    isNotNull(matches.knockoutRound),
    ne(matches.status, MatchStatusEnum.COMPLETED),
    ne(matches.status, MatchStatusEnum.CANCELLED),
  );
  await database
    .update(matches)
    .set({ slot1GameTeamId: null, updatedAt: now })
    .where(
      and(unsettledKnockout, eq(matches.slot1GameTeamId, args.gameTeamId)),
    );
  await database
    .update(matches)
    .set({ slot2GameTeamId: null, updatedAt: now })
    .where(
      and(unsettledKnockout, eq(matches.slot2GameTeamId, args.gameTeamId)),
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
  const removesDrawnTeam =
    isDrawnTournament(game.format, game.poolCount, game.tournamentShape) &&
    isPoolDrawPosted(game);
  await database.transaction(async (tx) => {
    let cancelledPoolMatches = false;
    if (removesDrawnTeam) {
      const gameTeamId = await registeredGameTeamId(tx, game.id, userId);
      if (gameTeamId) {
        cancelledPoolMatches = await cancelUnplayedPoolMatchesForGameTeam(tx, {
          gameId: game.id,
          gameTeamId,
        });
        await vacateUnplayedKnockoutSlotsForGameTeam(tx, {
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
    if (removesDrawnTeam) {
      await placeKnockoutQualifiers(tx, game, { knockoutRound: null });
    }
    if (cancelledPoolMatches) {
      await notifyIfGameFinished(tx, game);
    }
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
