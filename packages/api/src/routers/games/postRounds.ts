import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { matches, tournamentDraftMatches } from "@repo/db";

import { roundProblems } from "@repo/domain/tournament-pairing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { matchTimes } from "#src/games/helpers/match-times";
import { lockGame } from "#src/games/lock-rows";
import {
  assertMakesPoolRounds,
  assertRoundInRange,
  assertRoundNotPosted,
  loadTournamentRoundContext,
} from "#src/games/tournament-round-context";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Posts drafted Rounds: each Round's Matches are created on its Courts and
 * times, in draft order, and its drafts are deleted. A Round goes up only
 * complete, and only once every earlier Round is posted or going up with it.
 */
export async function postRounds(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    roundNumbers: number[];
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertMakesPoolRounds(game, locale);
  const context = await loadTournamentRoundContext(database, game);
  const roundNumbers = [...new Set(args.roundNumbers)].sort((a, b) => a - b);

  const posting = new Set(roundNumbers);
  const inserts: (typeof matches.$inferInsert)[] = [];
  for (const roundNumber of roundNumbers) {
    assertRoundInRange(context, roundNumber, locale);
    assertRoundNotPosted(context, roundNumber, locale);
    for (let earlier = 1; earlier < roundNumber; earlier += 1) {
      if (!posting.has(earlier) && !context.posted.has(earlier)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            messagesFor(locale).tournament.errors.postRoundFirst(earlier),
        });
      }
    }
    const pairings = context.drafts.get(roundNumber) ?? [];
    const problems = roundProblems({
      pools: context.pools,
      roundNumber,
      suggested: context.suggested,
      pairings,
      requireComplete: true,
    });
    if (problems.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          messagesFor(locale).tournament.errors.roundNotComplete(roundNumber),
      });
    }
    const slots = context.slots.get(roundNumber) ?? [];
    pairings.forEach((pairing, position) => {
      const slot = slots[position];
      if (!slot) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: messagesFor(locale).tournament.errors.roundRecordCourts,
        });
      }
      inserts.push({
        gameId: game.id,
        roundNumber,
        ...matchTimes({
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationInMinutes: null,
          courtId: slot.courtId,
          slot1GameTeamId: pairing.slot1GameTeamId,
          slot2GameTeamId: pairing.slot2GameTeamId,
        }),
      });
    });
  }
  if (inserts.length === 0) {
    return { ok: true as const, matchCount: 0 };
  }

  await database.transaction(async (tx) => {
    // The Game row lock serialises two posts of a Round, and a post with an
    // undo of the draw, so the check below sees the other's Matches.
    assertMakesPoolRounds(await lockGame(tx, game.id, locale), locale);
    const already = await tx.query.matches.findFirst({
      where: and(
        eq(matches.gameId, game.id),
        inArray(matches.roundNumber, roundNumbers),
      ),
      columns: { id: true, knockoutRound: true },
    });
    if (already && already.knockoutRound == null) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).tournament.errors.roundAlreadyPosted,
      });
    }
    for (const values of inserts) {
      await tx.insert(matches).values(values);
    }
    await tx
      .delete(tournamentDraftMatches)
      .where(
        and(
          eq(tournamentDraftMatches.gameId, game.id),
          inArray(tournamentDraftMatches.roundNumber, roundNumbers),
        ),
      );
  });

  return { ok: true as const, matchCount: inserts.length };
}

export const postRoundsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      roundNumbers: z.array(z.number().int().min(1)).min(1).max(64),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postRounds(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      roundNumbers: input.roundNumbers,
      locale: ctx.locale,
    });
  });
