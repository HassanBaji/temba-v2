import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { takeBackKnockoutQualifiers } from "#src/games/knockout-advance";
import { lockGame } from "#src/games/lock-rows";
import {
  assertKnockoutNotStarted,
  assertMakesPoolRounds,
  loadTournamentRoundContext,
  moveKnockoutAfterPoolRounds,
} from "#src/games/tournament-round-context";
import { generateRounds } from "#src/routers/games/generateRounds";
import { postRounds } from "#src/routers/games/postRounds";

/**
 * Adds one Pool Round after the last, on a posted draw. The new Round is not
 * made: the Organizer generates or pairs it like any other. With `post` it is
 * paired and posted in the same step, for a screen that has no Round drafts;
 * that needs every earlier Round posted. A tournament that had finished is
 * open again until the new Round is settled, and a Knockout waiting on the
 * Pools moves after it and loses the qualifiers already placed.
 */
export async function addRound(
  database: typeof db,
  args: {
    gameId: string;
    organizerUserId: string;
    post?: boolean;
    random?: () => number;
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
    const context = await loadTournamentRoundContext(tx, locked);
    if (context.roundCount >= context.maxRoundCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.roundsAtMost(
          context.maxRoundCount,
        ),
      });
    }
    assertKnockoutNotStarted(context, locale);
    await takeBackKnockoutQualifiers(
      tx,
      locked,
      { knockoutRound: null },
      locale,
    );

    const roundCount = context.roundCount + 1;
    await tx
      .update(games)
      .set({ roundCount, updatedAt: new Date() })
      .where(eq(games.id, locked.id));
    await moveKnockoutAfterPoolRounds(tx, context, roundCount);

    if (args.post) {
      await generateRounds(tx, {
        gameId: locked.id,
        organizerUserId: args.organizerUserId,
        scope: "next",
        random: args.random,
        locale,
      });
      await postRounds(tx, {
        gameId: locked.id,
        organizerUserId: args.organizerUserId,
        roundNumbers: [roundCount],
        locale,
      });
    }

    return { ok: true as const, roundCount, posted: args.post === true };
  });
}

export const addRoundProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      post: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addRound(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      post: input.post,
      locale: ctx.locale,
    });
  });
