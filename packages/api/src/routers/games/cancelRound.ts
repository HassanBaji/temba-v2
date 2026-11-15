import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  games,
  matches,
  matchSets,
  tournamentDraftMatches,
} from "@repo/db";

import { roundProblems } from "@repo/domain/tournament-pairing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  placeKnockoutQualifiers,
  takeBackKnockoutQualifiers,
} from "#src/games/knockout-advance";
import { lockGame } from "#src/games/lock-rows";
import { clearMatchResultConfirmations } from "#src/games/match-result-confirmations";
import {
  assertKnockoutNotStarted,
  assertMakesPoolRounds,
  assertRoundInRange,
  loadTournamentRoundContext,
  moveKnockoutAfterPoolRounds,
  roundCancelEffect,
  type TournamentRoundContext,
} from "#src/games/tournament-round-context";
import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";
import { removeJob } from "#src/jobs/enqueue";
import { scoreStandsJobKey } from "#src/jobs/specs";
import { notifyIfGameFinished } from "#src/notifications/notify-game-finished";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Takes a Round nobody has played off the schedule. Its drafts and unscored
 * Matches go, the draft Rounds after it move up a number, and the Round count
 * drops by one. A draft that no longer fits its new number (a Pool that sits
 * that Round out) is dropped for the Organizer to make again.
 */
async function removeRound(
  tx: Tx,
  context: TournamentRoundContext,
  roundNumber: number,
  locale: Locale,
) {
  if (context.roundCount <= 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.keepOneRound,
    });
  }
  assertKnockoutNotStarted(context, locale);
  const gameId = context.game.id;
  await takeBackKnockoutQualifiers(
    tx,
    context.game,
    { knockoutRound: null },
    locale,
  );

  await tx
    .delete(matches)
    .where(
      and(
        eq(matches.gameId, gameId),
        eq(matches.roundNumber, roundNumber),
        isNull(matches.knockoutRound),
      ),
    );
  await tx
    .delete(tournamentDraftMatches)
    .where(
      and(
        eq(tournamentDraftMatches.gameId, gameId),
        eq(tournamentDraftMatches.roundNumber, roundNumber),
      ),
    );
  // One Round at a time, so a moved draft never lands on a number still taken.
  for (let later = roundNumber + 1; later <= context.roundCount; later += 1) {
    const fits =
      roundProblems({
        pools: context.pools,
        roundNumber: later - 1,
        suggested: context.suggested,
        pairings: context.drafts.get(later) ?? [],
        requireComplete: false,
      }).length === 0;
    const draftOfRound = and(
      eq(tournamentDraftMatches.gameId, gameId),
      eq(tournamentDraftMatches.roundNumber, later),
    );
    if (fits) {
      await tx
        .update(tournamentDraftMatches)
        .set({ roundNumber: later - 1 })
        .where(draftOfRound);
    } else {
      await tx.delete(tournamentDraftMatches).where(draftOfRound);
    }
  }

  const roundCount = context.roundCount - 1;
  await tx
    .update(games)
    .set({ roundCount, updatedAt: new Date() })
    .where(eq(games.id, gameId));
  await moveKnockoutAfterPoolRounds(tx, context, roundCount);
  return roundCount;
}

/**
 * Cancels every Match of a posted Round where it stands. A confirmed score is
 * first taken back under the wrong-score rule, so its ratings and Pool points
 * go with it; the whole Round is refused if one of them cannot be.
 */
async function voidRound(
  tx: Tx,
  context: TournamentRoundContext,
  args: { roundNumber: number; organizerUserId: string },
  locale: Locale,
) {
  const rows = [...(context.posted.get(args.roundNumber) ?? [])].sort(
    (left, right) => left.id.localeCompare(right.id),
  );
  for (const row of rows) {
    if (row.status !== MatchStatusEnum.COMPLETED) {
      continue;
    }
    const eligibility = await wrongScoreReversalEligibility(tx, row.id, locale);
    if (!eligibility.eligible) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).tournament.errors.cancelRoundRatedLater(
          args.roundNumber,
        ),
      });
    }
  }

  const now = new Date();
  for (const row of rows) {
    if (row.status === MatchStatusEnum.CANCELLED) {
      continue;
    }
    if (row.status === MatchStatusEnum.COMPLETED) {
      await reportWrongScore(tx, {
        gameId: context.game.id,
        matchId: row.id,
        userId: args.organizerUserId,
        locale,
      });
    }
    await tx.delete(matchSets).where(eq(matchSets.matchId, row.id));
    await clearMatchResultConfirmations(tx, row.id);
    await removeJob(tx, scoreStandsJobKey(row.id));
    await tx
      .update(matches)
      .set({
        status: MatchStatusEnum.CANCELLED,
        notFinishedAt: null,
        updatedAt: now,
      })
      .where(eq(matches.id, row.id));
  }
}

/**
 * Cancels a Pool Round on a posted draw, played or not. A Round nobody has
 * played, with no posted Round after it, comes off the schedule. Any other
 * Round stays in the list as cancelled, and its scores count for nobody.
 */
export async function cancelRound(
  database: typeof db,
  args: {
    gameId: string;
    organizerUserId: string;
    roundNumber: number;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertMakesPoolRounds(game, locale);

  return database.transaction(async (tx) => {
    const locked = await lockGame(tx, game.id, locale);
    assertMakesPoolRounds(locked, locale);
    // The Match locks wait out a score being written, so the Round is read
    // with it.
    await tx
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.gameId, locked.id),
          eq(matches.roundNumber, args.roundNumber),
        ),
      )
      .orderBy(matches.id)
      .for("update");
    const context = await loadTournamentRoundContext(tx, locked);
    assertRoundInRange(context, args.roundNumber, locale);

    const effect = roundCancelEffect(context, args.roundNumber);
    if (effect === "none") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.roundAlreadyCancelled(
          args.roundNumber,
        ),
      });
    }

    let roundCount = context.roundCount;
    if (effect === "remove") {
      roundCount = await removeRound(tx, context, args.roundNumber, locale);
    } else {
      await voidRound(tx, context, args, locale);
    }

    const settled = { ...locked, roundCount };
    await placeKnockoutQualifiers(tx, settled, { knockoutRound: null });
    await notifyIfGameFinished(tx, settled);
    return { ok: true as const, removed: effect === "remove", roundCount };
  });
}

export const cancelRoundProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      roundNumber: z.number().int().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelRound(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      roundNumber: input.roundNumber,
      locale: ctx.locale,
    });
  });
