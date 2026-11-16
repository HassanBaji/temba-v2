import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, americanoSeats } from "@repo/db";

import { isAmericano } from "@repo/domain/tournament-americano";
import { shortPlayerName } from "@repo/domain/player-name";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  americanoRoundHasScore,
  loadAmericanoMatches,
  loadAmericanoPlayers,
} from "#src/games/americano-matches";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type SeatedPairing = {
  roundNumber: number;
  slot1: readonly string[];
  slot2: readonly string[];
};

function partnerKey(pair: readonly string[]) {
  return [...pair].sort().join("|");
}

/** Pairs of players who partner more than once. Empty when the rule holds. */
export function repeatedPartners(pairings: readonly SeatedPairing[]) {
  const seen = new Map<string, { pair: readonly string[]; count: number }>();
  for (const pair of pairings.flatMap((pairing) => [
    pairing.slot1,
    pairing.slot2,
  ])) {
    const entry = seen.get(partnerKey(pair)) ?? { pair, count: 0 };
    entry.count += 1;
    seen.set(partnerKey(pair), entry);
  }
  return [...seen.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => entry.pair);
}

function swapIn(pair: readonly string[], first: string, second: string) {
  return pair.map((player) =>
    player === first ? second : player === second ? first : player,
  );
}

/** Swaps two players' places in one Round only. */
export function swapPlayersInRound<Pairing extends SeatedPairing>(
  pairings: readonly Pairing[],
  roundNumber: number,
  first: string,
  second: string,
): Pairing[] {
  return pairings.map((pairing) =>
    pairing.roundNumber === roundNumber
      ? {
          ...pairing,
          slot1: swapIn(pairing.slot1, first, second),
          slot2: swapIn(pairing.slot2, first, second),
        }
      : pairing,
  );
}

/**
 * Swaps two players in one Round of an Americano that has not started: no
 * Match in it has a score or is completed (ADR-0094). Two players on one
 * court swap places there; two on different courts swap courts. Refused when
 * it would give anyone the same partner twice.
 */
export async function swapAmericanoPlayers(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    roundNumber: number;
    firstGamePlayerId: string;
    secondGamePlayerId: string;
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
  if (args.firstGamePlayerId === args.secondGamePlayerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.samePlayer });
  }

  return database.transaction(async (tx) => {
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (!locked.drawPostedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.noRounds });
    }
    const rows = await loadAmericanoMatches(tx, game.id);
    const round = rows.filter(
      (row) =>
        row.roundNumber === args.roundNumber &&
        row.status !== MatchStatusEnum.CANCELLED,
    );
    if (round.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: m.roundNotFound });
    }
    if (americanoRoundHasScore(round)) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.roundStarted });
    }
    const seatOf = (gamePlayerId: string) =>
      round
        .flatMap((row) => row.americanoSeats.map((seat) => ({ row, seat })))
        .find(({ seat }) => seat.gamePlayerId === gamePlayerId);
    const first = seatOf(args.firstGamePlayerId);
    const second = seatOf(args.secondGamePlayerId);
    if (!first || !second) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.playerNotInRound });
    }

    const pairings = rows.filter(
      (row) => row.status !== MatchStatusEnum.CANCELLED,
    );
    const before = new Set(repeatedPartners(pairings).map(partnerKey));
    const fresh = repeatedPartners(
      swapPlayersInRound(
        pairings,
        args.roundNumber,
        args.firstGamePlayerId,
        args.secondGamePlayerId,
      ),
    ).filter((pair) => !before.has(partnerKey(pair)));
    const repeat = fresh[0];
    if (repeat?.[0] && repeat[1]) {
      const players = await loadAmericanoPlayers(tx, game.id);
      const name = (gamePlayerId: string) =>
        shortPlayerName(
          players.find((player) => player.gamePlayerId === gamePlayerId)
            ?.name ?? "",
        );
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.repeatsPartner(name(repeat[0]), name(repeat[1])),
      });
    }

    const now = new Date();
    await tx
      .update(americanoSeats)
      .set({ matchId: second.row.id, slot: second.seat.slot, updatedAt: now })
      .where(eq(americanoSeats.id, first.seat.id));
    await tx
      .update(americanoSeats)
      .set({ matchId: first.row.id, slot: first.seat.slot, updatedAt: now })
      .where(eq(americanoSeats.id, second.seat.id));
    return { ok: true as const };
  });
}

export const swapAmericanoPlayersInputSchema = z.object({
  gameId: z.string().uuid(),
  roundNumber: z.number().int().min(1),
  firstGamePlayerId: z.string().uuid(),
  secondGamePlayerId: z.string().uuid(),
});

export const swapAmericanoPlayersProcedure = protectedProcedure
  .input(swapAmericanoPlayersInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return swapAmericanoPlayers(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
      locale: ctx.locale,
    });
  });
