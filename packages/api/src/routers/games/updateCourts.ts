import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameCourts, games } from "@repo/db";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertCourtAtGameVenue } from "#src/games/assert-court-assignable";

/**
 * A Friendly tournament's recorded Courts, the ones its Rounds are scheduled
 * on. Allowed while the tournament runs, so a Court can join or leave between
 * Rounds: Matches already posted keep the Court they were given.
 */
export async function updateGameCourts(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    courtIds: string[];
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).game.errors;
  const now = args.now ?? new Date();
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.courtsTournamentOnly,
    });
  }
  if (game.cancelledAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.editCancelled });
  }
  if (game.windowEnd != null && game.windowEnd.getTime() <= now.getTime()) {
    throw new TRPCError({ code: "FORBIDDEN", message: m.played });
  }
  const courtIds = [...new Set(args.courtIds)];
  if (courtIds.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.courtsAtLeastOne });
  }
  for (const courtId of courtIds) {
    await assertCourtAtGameVenue(database, game, courtId, locale);
  }

  await database.transaction(async (tx) => {
    await tx.delete(gameCourts).where(eq(gameCourts.gameId, game.id));
    await tx
      .insert(gameCourts)
      .values(courtIds.map((courtId) => ({ gameId: game.id, courtId })));
    await tx.update(games).set({ updatedAt: now }).where(eq(games.id, game.id));
  });
  return { ok: true as const };
}

export const updateCourts = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      courtIds: z.array(z.string().uuid()).min(1).max(32),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameCourts(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      courtIds: input.courtIds,
      locale: ctx.locale,
    });
  });
