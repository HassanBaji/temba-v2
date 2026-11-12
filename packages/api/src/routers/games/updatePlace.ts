import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  bookings,
  gameCourts,
  games,
  matches,
} from "@repo/db";

import { sportOrDefault } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameNotFrozen,
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";
import { assertCourtAssignable } from "#src/games/assert-court-assignable";
import { assertGameCreateVenueAndCourt } from "#src/games/assert-game-create-venue-and-court";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A Friendly game's Venue and its one Court (a Pitch on football). Padel
 * keeps the Court on the Match; football records it on the Game and copies
 * it onto the Match once teams are published, so both places move together.
 * A new Venue passes the same checks as at create.
 */
async function updateFriendlyGamePlace(
  database: Tx,
  game: GameRow,
  place: { venueId: string; courtId: string | null },
  locale: Locale,
  now: Date,
) {
  const m = messagesFor(locale).game.errors;
  if (game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.courtEditFriendlyOnly,
    });
  }
  await assertGameNotFrozen(database, game, now, locale);
  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.gameId, game.id),
    columns: { id: true },
  });
  if (booking) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.courtFromBooking });
  }

  const venueMoves = place.venueId !== game.venueId;
  if (venueMoves) {
    await assertGameCreateVenueAndCourt(database, {
      groupId: game.groupId ?? undefined,
      venueId: place.venueId,
      courtId: place.courtId,
      sport: sportOrDefault(game.sport),
      locale,
    });
    await database
      .update(games)
      .set({ venueId: place.venueId, updatedAt: now })
      .where(eq(games.id, game.id));
  } else if (place.courtId) {
    await assertCourtAssignable(database, game, place.courtId, locale);
  }

  await database
    .update(matches)
    .set({ courtId: place.courtId, updatedAt: now })
    .where(
      and(
        eq(matches.gameId, game.id),
        ne(matches.status, MatchStatusEnum.CANCELLED),
      ),
    );
  if (game.sport === "football") {
    await database.delete(gameCourts).where(eq(gameCourts.gameId, game.id));
    if (place.courtId) {
      await database
        .insert(gameCourts)
        .values({ gameId: game.id, courtId: place.courtId });
    }
  }
}

export async function updateGamePlace(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    venueId: string;
    courtId: string | null;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await database.transaction(async (tx) => {
    await updateFriendlyGamePlace(
      tx,
      game,
      { venueId: args.venueId, courtId: args.courtId },
      locale,
      args.now ?? new Date(),
    );
  });
  return { ok: true as const };
}

export const updatePlace = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      venueId: z.string().uuid(),
      courtId: z.string().uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGamePlace(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      venueId: input.venueId,
      courtId: input.courtId,
      locale: ctx.locale,
    });
  });
