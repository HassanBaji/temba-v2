import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { matchSets } from "@repo/db";

import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "@repo/domain/friendly-game-results";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertMayWriteSets } from "#src/games/assert-may-write-sets";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import { settleConfirmationsAfterSetChange } from "#src/games/confirmations-after-set-change";
import { lockMatch } from "#src/games/lock-rows";
import { requireMatchOnGame } from "#src/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function scoreSet(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    userId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  for (const gamesWon of [args.slot1GamesWon, args.slot2GamesWon]) {
    if (
      gamesWon < FRIENDLY_SET_GAMES_MIN ||
      gamesWon > FRIENDLY_SET_GAMES_MAX
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.gamesInSetBetween(
          FRIENDLY_SET_GAMES_MIN,
          FRIENDLY_SET_GAMES_MAX,
        ),
      });
    }
  }
  const game = await requireGame(database, args.gameId, locale);
  const match = await requireMatchOnGame(
    database,
    game.id,
    args.matchId,
    locale,
  );
  const organizer = await isGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    const locked = await lockMatch(tx, match.id, locale);
    await assertMayWriteSets(tx, game, locked, args.userId, organizer, locale);
    if (!(await bothSlottedTeamsComplete(tx, locked))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.scoreNeedsTeams,
      });
    }
    const set = await tx.query.matchSets.findFirst({
      where: eq(matchSets.id, args.setId),
    });
    if (set?.matchId !== locked.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).game.errors.setNotFound,
      });
    }
    const [updated] = await tx
      .update(matchSets)
      .set({
        slot1GamesWon: args.slot1GamesWon,
        slot2GamesWon: args.slot2GamesWon,
        updatedAt: new Date(),
      })
      .where(eq(matchSets.id, set.id))
      .returning();
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save Set",
      });
    }
    await settleConfirmationsAfterSetChange(tx, {
      game,
      match: locked,
      userId: args.userId,
      scoreChanged:
        set.slot1GamesWon !== args.slot1GamesWon ||
        set.slot2GamesWon !== args.slot2GamesWon,
    });
  });

  return { ok: true as const };
}

export const scoreSetProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      setId: z.string().uuid(),
      slot1GamesWon: z
        .number()
        .int()
        .min(FRIENDLY_SET_GAMES_MIN)
        .max(FRIENDLY_SET_GAMES_MAX),
      slot2GamesWon: z
        .number()
        .int()
        .min(FRIENDLY_SET_GAMES_MIN)
        .max(FRIENDLY_SET_GAMES_MAX),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return scoreSet(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      setId: input.setId,
      userId: appUser.id,
      slot1GamesWon: input.slot1GamesWon,
      slot2GamesWon: input.slot2GamesWon,
      locale: ctx.locale,
    });
  });
