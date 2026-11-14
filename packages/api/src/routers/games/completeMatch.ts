import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets, matches } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import { confirmsAsOrganizer } from "#src/games/confirms-as-organizer";
import {
  advanceKnockoutWinner,
  knockoutLevelMessage,
  knockoutMatchIsLevel,
  placeKnockoutQualifiers,
} from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import { messagesFor } from "@repo/i18n/messages";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { scheduleMvpSettle } from "#src/marks/settle-mvp";
import { notifyIfGameFinished } from "#src/notifications/notify-game-finished";
import { applyRatedMatch } from "#src/ratings/apply-rated-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function completeMatch(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  const match = await requireMatchOnGame(
    database,
    game.id,
    args.matchId,
    locale,
  );
  if (!(await confirmsAsOrganizer(database, game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.completeOrganizerOnly,
    });
  }

  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.americanoNoMatchesToComplete,
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.completeCancelledMatch,
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchCompleted,
    });
  }
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.completeNeedsTeams,
    });
  }
  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).game.errors.matchNotFound,
      });
    }
    if (locked.status === MatchStatusEnum.CANCELLED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.completeCancelledMatch,
      });
    }
    if (locked.status === MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.matchCompleted,
      });
    }

    const sets = await tx.query.matchSets.findMany({
      where: eq(matchSets.matchId, locked.id),
      columns: { slot1GamesWon: true, slot2GamesWon: true },
    });
    if (sets.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.addSetFirst,
      });
    }
    const outcome = matchOutcome(sets);
    if (outcome.result === "none") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.scoreSetFirst,
      });
    }
    if (knockoutMatchIsLevel(locked, outcome.result)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: knockoutLevelMessage(args.locale ?? DEFAULT_LOCALE),
      });
    }

    const now = new Date();
    await tx
      .update(matches)
      .set({
        status: MatchStatusEnum.COMPLETED,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(matches.id, locked.id));
    await applyRatedMatch(tx, game, locked, outcome.result);
    await scheduleMvpSettle(tx, {
      gameId: game.id,
      matchId: locked.id,
      completedAt: now,
    });
    await advanceKnockoutWinner(tx, locked, outcome.result);
    await placeKnockoutQualifiers(tx, game, locked);
    await notifyIfGameFinished(tx, game);
  });
  return { ok: true as const };
}

export const completeMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return completeMatch(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
