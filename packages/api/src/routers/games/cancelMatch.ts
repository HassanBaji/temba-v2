import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";
import {
  assertGameCancellable,
  cancelGameRecord,
} from "#src/games/helpers/cancel-game-record";
import {
  awardKnockoutWalkover,
  isKnockoutMatch,
  placeKnockoutQualifiers,
} from "#src/games/knockout-advance";
import { notifyIfGameFinished } from "#src/notifications/notify-game-finished";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function cancelMatchOnGame(
  database: Tx,
  game: GameRow,
  matchId: string,
  advancingGameTeamId: string | undefined,
  locale: Locale,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.alreadyCancelled,
    });
  }
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.americanoNoMatches,
    });
  }

  const [match] = await database
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
  if (match?.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchAlreadyCancelled,
    });
  }

  if (game.format === "friendly_game") {
    await assertGameCancellable(database, game, locale);
    await cancelGameRecord(database, game, locale);
    return { cancelledGame: true as const };
  }

  if (isKnockoutMatch(match)) {
    if (match.status === MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.knockoutMatchCompleted,
      });
    }
    await awardKnockoutWalkover(database, match, advancingGameTeamId, locale);
    await notifyIfGameFinished(database, game);
    return { cancelledGame: false as const };
  }
  if (advancingGameTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.poolMatchNotAwarded,
    });
  }

  const now = new Date();
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.id, match.id));
  await placeKnockoutQualifiers(database, game, match);
  await notifyIfGameFinished(database, game);
  return { cancelledGame: false as const };
}

export async function cancelMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    matchId: string;
    advancingGameTeamId?: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  return database.transaction(async (tx) => {
    return cancelMatchOnGame(
      tx,
      game,
      args.matchId,
      args.advancingGameTeamId,
      args.locale ?? DEFAULT_LOCALE,
    );
  });
}

export const cancelMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      advancingGameTeamId: z.string().uuid().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      matchId: input.matchId,
      advancingGameTeamId: input.advancingGameTeamId,
      locale: ctx.locale,
    });
  });
