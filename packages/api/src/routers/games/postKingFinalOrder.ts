import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, games } from "@repo/db";

import {
  finalOrderIssue,
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

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Posts the King of the court final order: `gameTeamIds` first place first,
 * at least the top three. Teams left out show as not placed. The Organizer
 * can post again for 24 hours after the first post.
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

  const drawnIds = (
    await database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      columns: { id: true, startCourt: true },
    })
  )
    .filter((team) => team.startCourt != null)
    .map((team) => team.id);
  const issue = finalOrderIssue(args.gameTeamIds, drawnIds);
  if (issue === "too_few") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.placeTop(KING_FINAL_ORDER_MIN),
    });
  }
  if (issue) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.unknownTeams });
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
