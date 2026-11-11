import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, bookings, gameCourts, matches } from "@repo/db";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";
import { assertCourtAssignable } from "#src/games/assert-court-assignable";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A Friendly game's one Court (a Pitch on football). Padel keeps it on the
 * Match; football records it on the Game and copies it onto the Match once
 * teams are published, so both places move together.
 */
async function updateFriendlyGameCourt(
  database: Tx,
  game: GameRow,
  courtId: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game.errors;
  if (game.cancelledAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.editCancelled });
  }
  if (game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.courtEditFriendlyOnly,
    });
  }
  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.gameId, game.id),
    columns: { id: true },
  });
  if (booking) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.courtFromBooking });
  }
  if (courtId) {
    await assertCourtAssignable(database, game, courtId, locale);
  }

  const now = new Date();
  await database
    .update(matches)
    .set({ courtId, updatedAt: now })
    .where(
      and(
        eq(matches.gameId, game.id),
        ne(matches.status, MatchStatusEnum.CANCELLED),
      ),
    );
  if (game.sport === "football") {
    await database.delete(gameCourts).where(eq(gameCourts.gameId, game.id));
    if (courtId) {
      await database.insert(gameCourts).values({ gameId: game.id, courtId });
    }
  }
}

export async function updateGameCourt(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    courtId: string | null;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await database.transaction(async (tx) => {
    await updateFriendlyGameCourt(tx, game, args.courtId, locale);
  });
  return { ok: true as const };
}

export const updateCourt = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      courtId: z.string().uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameCourt(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      courtId: input.courtId,
      locale: ctx.locale,
    });
  });
