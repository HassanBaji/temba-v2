import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, americanoSeats } from "@repo/db";

import {
  isAmericano,
  repeatedPartners,
  swapPlayersInRound,
} from "@repo/domain/tournament-americano";
import { shortPlayerName } from "@repo/domain/player-name";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  loadAmericanoMatches,
  loadAmericanoPlayers,
} from "#src/games/americano-matches";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function pairKey(pair: readonly string[]) {
  return [...pair].sort().join("|");
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
    if (
      round.some(
        (row) =>
          row.sets.length > 0 || row.status === MatchStatusEnum.COMPLETED,
      )
    ) {
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

    const live = rows.filter((row) => row.status !== MatchStatusEnum.CANCELLED);
    const pairings = live.map((row) => ({
      roundNumber: row.roundNumber,
      slot1: [row.slot1[0] ?? "", row.slot1[1] ?? ""] as const,
      slot2: [row.slot2[0] ?? "", row.slot2[1] ?? ""] as const,
    }));
    const before = new Set(repeatedPartners(pairings).map(pairKey));
    const fresh = repeatedPartners(
      swapPlayersInRound(
        pairings,
        args.roundNumber,
        args.firstGamePlayerId,
        args.secondGamePlayerId,
      ),
    ).filter((pair) => !before.has(pairKey(pair)));
    const repeat = fresh[0];
    if (repeat) {
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
