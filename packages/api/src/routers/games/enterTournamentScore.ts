import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";

import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "@repo/domain/friendly-game-results";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import { knockoutMatchIsLevel } from "#src/games/knockout-advance";
import { lockMatch } from "#src/games/lock-rows";
import {
  clearMatchResultConfirmations,
  matchSideSeats,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { askOtherTeamToConfirm, seatedSlot } from "#src/games/tournament-score";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { removeJob } from "#src/jobs/enqueue";
import { scoreStandsJobKey } from "#src/jobs/specs";
import { matchOutcome } from "@repo/domain/match-outcome";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Games won by each team in a tournament Match, as one Set (ADR-0062).
 * A seated player's score waits for one tap from the other team, and stands
 * on its own after ten minutes. An Organizer sets the score outright, whether
 * or not they play in the Match (ADR-0075), including over a confirmed one,
 * which is first reopened under the usual wrong-score rule.
 */
export async function enterTournamentScore(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    userId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  for (const gamesWon of [args.slot1GamesWon, args.slot2GamesWon]) {
    if (
      !Number.isInteger(gamesWon) ||
      gamesWon < FRIENDLY_SET_GAMES_MIN ||
      gamesWon > FRIENDLY_SET_GAMES_MAX
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.scoreGamesBetween(
          FRIENDLY_SET_GAMES_MIN,
          FRIENDLY_SET_GAMES_MAX,
        ),
      });
    }
  }
  const game = await requireGame(database, args.gameId, locale);
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.scoreOnTournamentMatch,
    });
  }
  const match = await requireMatchOnGame(
    database,
    game.id,
    args.matchId,
    locale,
  );
  const [organizer, sides] = await Promise.all([
    isGameOrganizer(database, game, args.userId),
    matchSideSeats(database, match),
  ]);
  const slot = seatedSlot(sides, args.userId);
  if (!organizer && slot == null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).tournament.errors.scoreTeamsOrOrganizer,
    });
  }
  const final = organizer;

  const now = new Date();
  // Checked under the Match lock and before any reopening, so a refused
  // score leaves a confirmed one, its ratings and its Knockout winner as
  // they were.
  await database.transaction(async (tx) => {
    const locked = await lockMatch(tx, match.id, locale);
    if (locked.status === MatchStatusEnum.CANCELLED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.matchCancelled,
      });
    }
    if (locked.status === MatchStatusEnum.COMPLETED && !final) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).tournament.errors.scoreConfirmed,
      });
    }
    if (!(await bothSlottedTeamsComplete(tx, locked))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).tournament.errors.scoreNeedsTwoPlayers,
      });
    }
    if (
      knockoutMatchIsLevel(
        locked,
        matchOutcome([
          {
            slot1GamesWon: args.slot1GamesWon,
            slot2GamesWon: args.slot2GamesWon,
          },
        ]).result,
      )
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.knockoutNeedsWinner,
      });
    }
    if (locked.status === MatchStatusEnum.COMPLETED) {
      await reportWrongScore(tx, {
        gameId: game.id,
        matchId: locked.id,
        userId: args.userId,
        locale,
      });
    }

    await tx
      .delete(matchSets)
      .where(and(eq(matchSets.matchId, match.id), gt(matchSets.setNumber, 1)));
    await tx
      .insert(matchSets)
      .values({
        matchId: match.id,
        setNumber: 1,
        slot1GamesWon: args.slot1GamesWon,
        slot2GamesWon: args.slot2GamesWon,
      })
      .onConflictDoUpdate({
        target: [matchSets.matchId, matchSets.setNumber],
        set: {
          slot1GamesWon: args.slot1GamesWon,
          slot2GamesWon: args.slot2GamesWon,
          updatedAt: now,
        },
      });
    await tx
      .update(matches)
      .set({ notFinishedAt: null, updatedAt: now })
      .where(eq(matches.id, match.id));
    await clearMatchResultConfirmations(tx, match.id);
    if (slot != null) {
      await recordMatchResultConfirmation(tx, match.id, args.userId);
    }
    if (final) {
      await removeJob(tx, scoreStandsJobKey(match.id));
      await runMatchCompletionEffect(tx, game, match.id);
    }
  });

  if (final) {
    return { ok: true as const, final: true };
  }
  await askOtherTeamToConfirm(database, {
    game,
    match,
    enteringSlot: slot ?? 1,
    actorUserId: args.userId,
    enteredAt: now,
  });
  return { ok: true as const, final: false };
}

export const enterTournamentScoreProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
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
    return enterTournamentScore(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
      slot1GamesWon: input.slot1GamesWon,
      slot2GamesWon: input.slot2GamesWon,
      locale: ctx.locale,
    });
  });
