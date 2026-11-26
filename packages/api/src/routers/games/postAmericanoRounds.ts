import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  americanoSeats,
  gameCourts,
  gameWaitlist,
  games,
  matches,
} from "@repo/db";

import {
  AMERICANO_PLAYER_MIN,
  AMERICANO_PLAYERS_PER_COURT,
  americanoFixedPairsFit,
  americanoRotatingPlayers,
  americanoRoundOf,
  americanoRounds,
  clampAmericanoRounds,
  isAmericano,
} from "@repo/domain/tournament-americano";
import { scheduleRoundSlots } from "@repo/domain/tournament-schedule";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  loadAmericanoFixedPairs,
  loadAmericanoPlayers,
} from "#src/games/americano-matches";
import { lockGame } from "#src/games/lock-rows";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function samePlayersOnce(
  order: readonly string[],
  expected: readonly string[],
) {
  const known = new Set(expected);
  return (
    order.length === known.size &&
    new Set(order).size === order.length &&
    order.every((id) => known.has(id))
  );
}

/**
 * Makes every Round of an Americano from the drawn order of its players
 * (ADR-0094). The order is the draw sheet as the Organizer left it; the
 * Rounds come from it, so a swap on the sheet moves the two players in every
 * Round. Every player on the Game plays, in fours, at least eight. Each
 * Match seats its four players directly, on the recorded Courts and times
 * laid out as a posted Pool draw lays them out. Its fixed pairs (ADR-0113)
 * partner in every Round. Making the Rounds closes the seats and empties the
 * Waitlist.
 */
export async function postAmericanoRounds(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    gamePlayerIds: readonly string[];
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

  const now = new Date();
  return database.transaction(async (tx) => {
    // Read under the Game lock, so a seat taken or left while the Organizer
    // was on the sheet is seen before the Rounds go up.
    const locked = await lockGame(tx, game.id, locale);
    if (locked.cancelledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.cancelled });
    }
    if (locked.drawPostedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.roundsMade });
    }
    if (!locked.windowStart || !locked.windowEnd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).tournament.errors.postDrawWindow,
      });
    }

    const players = await loadAmericanoPlayers(tx, game.id);
    if (players.length < AMERICANO_PLAYER_MIN) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.belowMinimum(AMERICANO_PLAYER_MIN),
      });
    }
    if (players.length % AMERICANO_PLAYERS_PER_COURT !== 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.notInFours(players.length),
      });
    }
    if (
      !samePlayersOnce(
        args.gamePlayerIds,
        players.map((player) => player.gamePlayerId),
      )
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.wrongPlayers });
    }

    const recorded = await tx.query.gameCourts.findMany({
      where: eq(gameCourts.gameId, game.id),
      with: { court: { columns: { id: true, name: true } } },
    });
    const courtIds = recorded
      .flatMap((row) => (row.court ? [row.court] : []))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      )
      .map((court) => court.id);
    if (courtIds.length < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.recordCourts });
    }

    const roundCount = clampAmericanoRounds(locked.roundCount, players.length);
    const fixedPairs = await loadAmericanoFixedPairs(tx, game.id);
    if (
      !americanoFixedPairsFit({
        players: players.length,
        rounds: roundCount,
        fixedPairs: fixedPairs.length,
      })
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.fixedPairsTooMany(
          americanoRotatingPlayers(players.length, fixedPairs.length),
          roundCount,
        ),
      });
    }
    const pairings = americanoRounds(
      args.gamePlayerIds,
      roundCount,
      fixedPairs,
    );
    const scheduled = scheduleRoundSlots({
      rounds: Array.from({ length: roundCount }, (_, index) => ({
        roundNumber: index + 1,
        items: americanoRoundOf(pairings, index + 1),
      })),
      courtIds,
      windowStart: locked.windowStart,
      windowEnd: locked.windowEnd,
      matchMinutes: locked.matchMinutes,
    });

    const lastEnd = Math.max(
      ...scheduled.map((slot) => slot.endTime.getTime()),
    );
    if (lastEnd > locked.windowEnd.getTime()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: m.roundsOverrun });
    }

    for (const slot of scheduled) {
      const [match] = await tx
        .insert(matches)
        .values({
          gameId: game.id,
          roundNumber: slot.roundNumber,
          courtId: slot.courtId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationInMinutes: Math.round(
            (slot.endTime.getTime() - slot.startTime.getTime()) / 60000,
          ),
        })
        .returning({ id: matches.id });
      if (!match) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Match",
        });
      }
      await tx.insert(americanoSeats).values([
        ...slot.item.slot1.map((gamePlayerId) => ({
          matchId: match.id,
          gamePlayerId,
          slot: 1,
        })),
        ...slot.item.slot2.map((gamePlayerId) => ({
          matchId: match.id,
          gamePlayerId,
          slot: 2,
        })),
      ]);
    }

    await tx
      .update(games)
      .set({
        drawPostedAt: now,
        registrationClosedAt: locked.registrationClosedAt ?? now,
        roundCount,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));
    await tx.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));

    return { ok: true as const, roundCount, matchCount: scheduled.length };
  });
}

export const postAmericanoRoundsInputSchema = z.object({
  gameId: z.string().uuid(),
  gamePlayerIds: z.array(z.string().uuid()).min(1).max(64),
});

export const postAmericanoRoundsProcedure = protectedProcedure
  .input(postAmericanoRoundsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postAmericanoRounds(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      gamePlayerIds: input.gamePlayerIds,
      locale: ctx.locale,
    });
  });
