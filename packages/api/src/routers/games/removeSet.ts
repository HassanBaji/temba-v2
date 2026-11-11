import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { matchSets } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertMayWriteSets } from "#src/games/assert-may-write-sets";
import { settleConfirmationsAfterSetChange } from "#src/games/confirmations-after-set-change";
import { lockMatch } from "#src/games/lock-rows";
import { requireMatchOnGame } from "#src/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function removeSet(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    userId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
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
    const deleted = await tx
      .delete(matchSets)
      .where(
        and(eq(matchSets.id, args.setId), eq(matchSets.matchId, locked.id)),
      )
      .returning({
        slot1GamesWon: matchSets.slot1GamesWon,
        slot2GamesWon: matchSets.slot2GamesWon,
      });
    const [removed] = deleted;
    if (!removed) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).game.errors.setNotFound,
      });
    }
    if (removed.slot1GamesWon != null || removed.slot2GamesWon != null) {
      await settleConfirmationsAfterSetChange(tx, {
        game,
        match: locked,
        userId: args.userId,
        scoreChanged: true,
      });
    }
  });
  return { ok: true as const };
}

export const removeSetProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      setId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removeSet(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      setId: input.setId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
