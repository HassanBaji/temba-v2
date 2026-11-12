import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame, type GameRow } from "#src/games/access";
import { confirmsAsOrganizer } from "#src/games/confirms-as-organizer";
import {
  knockoutLevelMessage,
  knockoutMatchIsLevel,
} from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import { messagesFor } from "@repo/i18n/messages";
import {
  confirmsBySide,
  keepMatchResultConfirmation,
  matchResultConfirmedUserIds,
  matchResultFullyConfirmed,
  matchSideSeats,
  matchSlotsActedFor,
  matchSlotsConfirmed,
  type MatchSlot,
} from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { seatedSlot } from "#src/games/tournament-score";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { type MatchRow } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * On a Match agreed by one player from each side, a side that already agreed
 * has nothing to add: another tap from it must not move the moment its score
 * stands from (ADR-0062). The User's sides are the one they are seated on
 * and, on a football Challenge Game, those whose Team they act for.
 */
async function sideAlreadyAgreed(
  database: DbClient,
  game: GameRow,
  match: MatchRow,
  userId: string,
  actedFor: readonly MatchSlot[],
) {
  if (!confirmsBySide(game)) {
    return false;
  }
  const seated = seatedSlot(await matchSideSeats(database, match), userId);
  const slots = new Set([...(seated == null ? [] : [seated]), ...actedFor]);
  if (slots.size === 0) {
    return false;
  }
  const agreed = await matchSlotsConfirmed(database, match);
  return [...slots].every((slot) => (slot === 1 ? agreed.slot1 : agreed.slot2));
}

/**
 * A User's confirmation that a Match's entered Sets are correct (ADR-0011).
 * A seated User confirms for themselves, and the Match completes once the
 * result is agreed. An Organizer's confirmation is final: it completes the
 * Match at once, without waiting on the players (ADR-0044); the players of a
 * padel Challenge Game organize it but confirm as players, and on a football
 * Challenge Game that counts for Temba Level whoever acts for a Team
 * confirms for that Team's side only, so the Match waits for the other
 * Team (ADR-0069). `slot` is kept for
 * clients that still name the side an Organizer confirms for; it is refused
 * from anyone else. The Match must already have a result and must not be
 * cancelled. Idempotent per Match+User: a repeat changes nothing, and a
 * repeat after the Match completed succeeds when the caller's confirmation
 * or Organizer's word already stands.
 */
export async function confirmMatchResult(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    userId: string;
    slot?: MatchSlot;
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

  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.confirmCancelledMatch,
    });
  }
  const [seated, organizer] = await Promise.all([
    userIsOnMatchSlots(database, match, args.userId),
    confirmsAsOrganizer(database, game, args.userId),
  ]);
  const actedFor = organizer
    ? []
    : await matchSlotsActedFor(database, match, args.userId);
  const confirmsForSide = seated || actedFor.length > 0;
  if (match.status === MatchStatusEnum.COMPLETED) {
    const confirmed = await matchResultConfirmedUserIds(database, match.id);
    if (organizer || (confirmsForSide && confirmed.includes(args.userId))) {
      return { ok: true as const };
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchCompleted,
    });
  }
  if (!organizer) {
    if (args.slot !== undefined) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.confirmForSideOrganizer,
      });
    }
    if (!confirmsForSide) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.confirmSeatedOrOrganizer,
      });
    }
  }

  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(sets);
  if (outcome.result === "none") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.noResultToConfirm,
    });
  }
  if (knockoutMatchIsLevel(match, outcome.result)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: knockoutLevelMessage(args.locale ?? DEFAULT_LOCALE),
    });
  }

  if (
    confirmsForSide &&
    !(await sideAlreadyAgreed(database, game, match, args.userId, actedFor))
  ) {
    await keepMatchResultConfirmation(database, match.id, args.userId);
  }

  if (organizer || (await matchResultFullyConfirmed(database, match))) {
    await runMatchCompletionEffect(database, game, match.id);
  }

  return { ok: true as const };
}

export const confirmMatchResultProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      slot: z.union([z.literal(1), z.literal(2)]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmMatchResult(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
      slot: input.slot,
      locale: ctx.locale,
    });
  });
