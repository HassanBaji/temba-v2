import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, games } from "@repo/db";

import { gameRates } from "@repo/domain/game-rating-eligibility";
import {
  canPostFinalOrder,
  finalOrderClosesAt,
  finalOrderStillOpen,
  isKingOfTheCourt,
  KING_FINAL_ORDER_MIN,
} from "@repo/domain/tournament-king";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { lockGame } from "#src/games/lock-rows";
import { enqueueAt } from "#src/jobs/enqueue";
import { kingPlaceAwardsJob } from "#src/jobs/specs";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Posts the King of the court final order: `gameTeamIds` first place first,
 * at least the top three. Teams left out show as not placed. The Organizer
 * can post again for 24 hours after the first post. On a Game that counts for
 * Temba Level the Place awards are written when those 24 hours end
 * (ADR-0089), so a corrected order never has to take a Level back.
 */
export async function postKingFinalOrder(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    gameTeamIds: readonly string[];
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const m = messagesFor(locale).tournamentKing.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  if (!isKingOfTheCourt(game.format, game.tournamentShape)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.notKing });
  }
  if (game.cancelledAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
  }
  if (game.drawPostedAt == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.notDrawn });
  }
  if (game.windowStart && game.windowStart.getTime() > now.getTime()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.notStarted });
  }
  if (!finalOrderStillOpen(game.finalOrderPostedAt, now)) {
    throw new TRPCError({ code: "FORBIDDEN", message: m.changeClosed });
  }

  const onCourtTeams = (
    await database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      columns: { id: true, startCourt: true },
      with: {
        players: { with: { gamePlayer: { columns: { userId: true } } } },
      },
    })
  ).filter((team) => team.startCourt != null);
  const onCourt = new Set(onCourtTeams.map((team) => team.id));
  if (
    new Set(args.gameTeamIds).size !== args.gameTeamIds.length ||
    args.gameTeamIds.some((id) => !onCourt.has(id))
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.unknownTeams });
  }
  if (!canPostFinalOrder(args.gameTeamIds.length, onCourt.size)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.placeTop(KING_FINAL_ORDER_MIN),
    });
  }

  await database.transaction(async (tx) => {
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (!finalOrderStillOpen(locked.finalOrderPostedAt, now)) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.changeClosed });
    }
    await tx
      .update(gameTeams)
      .set({ finalPlace: null, updatedAt: now })
      .where(eq(gameTeams.gameId, game.id));
    for (const [index, gameTeamId] of args.gameTeamIds.entries()) {
      await tx
        .update(gameTeams)
        .set({ finalPlace: index + 1, updatedAt: now })
        .where(eq(gameTeams.id, gameTeamId));
    }
    await tx
      .update(games)
      .set({
        finalOrderPostedAt: locked.finalOrderPostedAt ?? now,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));

    if (locked.finalOrderPostedAt == null) {
      if (gameRates(locked)) {
        await enqueueAt(
          tx,
          kingPlaceAwardsJob(game.id),
          finalOrderClosesAt(now),
        );
      }
      await notify(tx, {
        type: "king_final_order_posted",
        recipients: onCourtTeams.flatMap((team) =>
          team.players.flatMap((link) =>
            link.gamePlayer?.userId
              ? [
                  {
                    userId: link.gamePlayer.userId,
                    audience: "player" as const,
                  },
                ]
              : [],
          ),
        ),
        excludeUserIds: [args.organizerUserId],
        actorUserId: args.organizerUserId,
        groupId: game.groupId,
        gameId: game.id,
      });
    }
  });

  return { ok: true as const };
}

export const postKingFinalOrderInputSchema = z.object({
  gameId: z.string().uuid(),
  gameTeamIds: z.array(z.string().uuid()).min(1).max(64),
});

export const postKingFinalOrderProcedure = protectedProcedure
  .input(postKingFinalOrderInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postKingFinalOrder(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      gameTeamIds: input.gameTeamIds,
      locale: ctx.locale,
    });
  });
