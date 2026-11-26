import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { americanoFixedPairs } from "@repo/db";

import {
  AMERICANO_FIXED_PAIR_MAX,
  americanoFixedPairsFit,
  americanoRotatingPlayers,
  clampAmericanoRounds,
  isAmericano,
} from "@repo/domain/tournament-americano";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { loadAmericanoPlayers } from "#src/games/americano-matches";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Replaces an Americano's fixed pairs (ADR-0113): two players each the
 * Organizer keeps together in every Match, at most two pairs. Open until the
 * Rounds are made. Everyone else must still get a new partner every Round,
 * so the pairs must leave more rotating players than there are Rounds.
 */
export async function setAmericanoFixedPairs(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    pairs: z.infer<typeof setAmericanoFixedPairsInputSchema>["pairs"];
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).tournamentAmericano.errors;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  if (!isAmericano(game.format, game.tournamentShape)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.notAmericano });
  }
  if (args.pairs.length > AMERICANO_FIXED_PAIR_MAX) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.fixedPairsMax(AMERICANO_FIXED_PAIR_MAX),
    });
  }
  const picked = args.pairs.flatMap((pair) => [
    pair.firstGamePlayerId,
    pair.secondGamePlayerId,
  ]);
  if (new Set(picked).size !== picked.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.fixedPairsTwice });
  }

  return database.transaction(async (tx) => {
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (locked.drawPostedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.fixedPairsLocked });
    }
    const players = await loadAmericanoPlayers(tx, game.id);
    const playing = new Set(players.map((player) => player.gamePlayerId));
    if (!picked.every((id) => playing.has(id))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.wrongPlayers });
    }
    const seats = Math.max(locked.playersAllowed ?? 0, players.length);
    const rounds = clampAmericanoRounds(locked.roundCount, seats);
    if (
      !americanoFixedPairsFit({
        players: seats,
        rounds,
        fixedPairs: args.pairs.length,
      })
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.fixedPairsTooMany(
          americanoRotatingPlayers(seats, args.pairs.length),
          rounds,
        ),
      });
    }

    await tx
      .delete(americanoFixedPairs)
      .where(eq(americanoFixedPairs.gameId, game.id));
    if (args.pairs.length > 0) {
      await tx.insert(americanoFixedPairs).values(
        args.pairs.map((pair, index) => ({
          gameId: game.id,
          position: index + 1,
          firstGamePlayerId: pair.firstGamePlayerId,
          secondGamePlayerId: pair.secondGamePlayerId,
        })),
      );
    }
    return { ok: true as const, pairCount: args.pairs.length };
  });
}

export const setAmericanoFixedPairsInputSchema = z.object({
  gameId: z.string().uuid(),
  pairs: z.array(
    z.object({
      firstGamePlayerId: z.string().uuid(),
      secondGamePlayerId: z.string().uuid(),
    }),
  ),
});

export const setAmericanoFixedPairsProcedure = protectedProcedure
  .input(setAmericanoFixedPairsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setAmericanoFixedPairs(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      pairs: input.pairs,
      locale: ctx.locale,
    });
  });
