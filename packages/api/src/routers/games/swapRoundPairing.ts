import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches } from "@repo/db";

import {
  repairLaterDrafts,
  roundProblems,
  swapPairing,
  swapRepairSeed,
} from "@repo/domain/tournament-pairing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertMakesPoolRounds,
  assertRoundInRange,
  loadTournamentRoundContext,
  madeRounds,
  postedPairings,
  replaceRoundDraft,
} from "#src/games/tournament-round-context";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Gives a team a new opponent in one Round; the team they were playing takes
 * the chosen team's place. A posted Round swaps only while neither Match has
 * a score. Later draft Rounds then re-pair so nobody meets twice, with the
 * same seed the client previews with.
 */
export async function swapRoundPairing(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    roundNumber: number;
    gameTeamId: string;
    opponentGameTeamId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertMakesPoolRounds(game, locale);
  const context = await loadTournamentRoundContext(database, game);
  assertRoundInRange(context, args.roundNumber, locale);

  const postedRows = context.posted.get(args.roundNumber) ?? [];
  const draft = context.drafts.get(args.roundNumber) ?? [];
  const current = postedRows.length > 0 ? postedPairings(postedRows) : draft;
  if (current.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.roundNotMade(
        args.roundNumber,
      ),
    });
  }
  const swapped = swapPairing(
    current,
    args.gameTeamId,
    args.opponentGameTeamId,
  );
  if (!swapped) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.pickPairedTeam,
    });
  }
  if (
    roundProblems({
      pools: context.pools,
      roundNumber: args.roundNumber,
      suggested: context.suggested,
      pairings: swapped,
      requireComplete: false,
    }).length > 0
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.samePool,
    });
  }

  const changed = swapped.flatMap((pairing, index) => {
    const before = current[index];
    return before &&
      (before.slot1GameTeamId !== pairing.slot1GameTeamId ||
        before.slot2GameTeamId !== pairing.slot2GameTeamId)
      ? [{ index, pairing }]
      : [];
  });
  if (postedRows.length > 0) {
    for (const { index } of changed) {
      const row = postedRows[index];
      if (
        row?.status !== MatchStatusEnum.PENDING ||
        row.sets.length > 0 ||
        row.notFinishedAt
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: messagesFor(locale).tournament.errors.scoredMatchKeepsTeams,
        });
      }
    }
  }

  const rounds = madeRounds(context).map((round) =>
    round.roundNumber === args.roundNumber
      ? { ...round, pairings: swapped }
      : round,
  );
  const repaired = repairLaterDrafts({
    pools: context.pools,
    suggested: context.suggested,
    roundCount: context.roundCount,
    rounds,
    changedRound: args.roundNumber,
    seed: swapRepairSeed(args),
  });

  await database.transaction(async (tx) => {
    if (postedRows.length > 0) {
      const now = new Date();
      for (const { index, pairing } of changed) {
        const row = postedRows[index];
        if (!row) {
          continue;
        }
        await tx
          .update(matches)
          .set({
            slot1GameTeamId: pairing.slot1GameTeamId,
            slot2GameTeamId: pairing.slot2GameTeamId,
            updatedAt: now,
          })
          .where(eq(matches.id, row.id));
      }
    } else {
      await replaceRoundDraft(tx, game.id, args.roundNumber, swapped);
    }
    for (const round of repaired.rounds) {
      if (round.draft && round.roundNumber > args.roundNumber) {
        await replaceRoundDraft(tx, game.id, round.roundNumber, round.pairings);
      }
    }
  });

  return { repeats: repaired.repeats };
}

export const swapRoundPairingProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      roundNumber: z.number().int().min(1),
      gameTeamId: z.string().uuid(),
      opponentGameTeamId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return swapRoundPairing(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      roundNumber: input.roundNumber,
      gameTeamId: input.gameTeamId,
      opponentGameTeamId: input.opponentGameTeamId,
      locale: ctx.locale,
    });
  });
