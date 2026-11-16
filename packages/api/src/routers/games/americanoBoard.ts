import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  americanoTable,
  isAmericano,
  type AmericanoTableRow,
} from "@repo/domain/tournament-americano";
import {
  currentRoundNumber,
  tournamentRoundState,
  type TournamentMatchState,
  type TournamentRoundState,
} from "@repo/domain/tournament-round-state";
import { tournamentMatchMinutes } from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import {
  americanoDayFinished,
  americanoMatchState,
  americanoResults,
  americanoRoundHasScore,
  loadAmericanoMatches,
  loadAmericanoPlayers,
  type AmericanoMatch,
} from "#src/games/americano-matches";
import { matchSideSeats } from "#src/games/match-result-confirmations";
import {
  enteredScore,
  mayConfirmEnteredScore,
} from "#src/games/tournament-score";
import { gameReach } from "#src/games/verifier-stamp";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AmericanoBoardMatch = {
  matchId: string;
  position: number;
  courtName: string | null;
  startTime: Date | null;
  /** The two Game players on each side: an Americano pair lives for one Match. */
  slot1PlayerIds: string[];
  slot2PlayerIds: string[];
  state: TournamentMatchState;
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
  enteredBySlot: 1 | 2 | null;
  enteredByName: string | null;
  standsAt: Date | null;
  viewerSlot: 1 | 2 | null;
  canEnterScore: boolean;
  canConfirm: boolean;
  canMarkNotFinished: boolean;
};

export type AmericanoBoardRound = {
  roundNumber: number;
  state: TournamentRoundState;
  startTime: Date | null;
  /** The Organizer may swap two players: nothing in the Round is scored yet. */
  canSwap: boolean;
  matches: AmericanoBoardMatch[];
};

/**
 * An Americano's Rounds, each Match's state and what the viewer may do with
 * it, and the one table of players (ADR-0094). Before the Rounds are made it
 * lists the players only.
 */
export async function americanoBoard(
  database: DbClient,
  args: { gameId: string; userId: string; now?: Date; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const game = await requireGame(database, args.gameId, locale);
  if (!(await gameReach(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  if (!isAmericano(game.format, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournamentAmericano.errors.notAmericano,
    });
  }
  const [organizer, players, rows] = await Promise.all([
    isGameOrganizer(database, game, args.userId),
    loadAmericanoPlayers(database, game.id),
    loadAmericanoMatches(database, game.id),
  ]);
  const viewer = players.find((player) => player.userId === args.userId);
  const nameOfUser = new Map(
    players.flatMap((player) =>
      player.userId ? [[player.userId, player.name] as const] : [],
    ),
  );

  async function boardMatch(
    row: AmericanoMatch,
    position: number,
  ): Promise<AmericanoBoardMatch> {
    const state = americanoMatchState(row, now);
    const sides = await matchSideSeats(database, row);
    const entered =
      state === "awaiting_confirmation"
        ? await enteredScore(database, row, sides)
        : null;
    const viewerSlot =
      sides.find((side) => side.userIds.includes(args.userId))?.slot ?? null;
    const live =
      state === "on_court" ||
      state === "awaiting_confirmation" ||
      state === "not_finished";
    const set = row.sets[0];
    return {
      matchId: row.id,
      position,
      courtName: row.court?.name ?? null,
      startTime: row.startTime,
      slot1PlayerIds: row.slot1,
      slot2PlayerIds: row.slot2,
      state,
      slot1GamesWon: set?.slot1GamesWon ?? null,
      slot2GamesWon: set?.slot2GamesWon ?? null,
      enteredBySlot: entered?.slot ?? null,
      enteredByName: entered ? (nameOfUser.get(entered.userId) ?? null) : null,
      standsAt: entered?.standsAt ?? null,
      viewerSlot,
      canEnterScore:
        (organizer && (live || state === "confirmed")) ||
        (viewerSlot != null && live),
      canConfirm: mayConfirmEnteredScore({
        state,
        viewerSlot,
        enteredSlot: entered?.slot ?? null,
        organizer,
      }),
      canMarkNotFinished:
        (organizer || viewerSlot != null) &&
        (state === "on_court" || state === "awaiting_confirmation"),
    };
  }

  const roundNumbers = [...new Set(rows.map((row) => row.roundNumber))].sort(
    (left, right) => left - right,
  );
  const rounds: AmericanoBoardRound[] = [];
  for (const roundNumber of roundNumbers) {
    const inRound = rows.filter((row) => row.roundNumber === roundNumber);
    const matches = await Promise.all(inRound.map(boardMatch));
    rounds.push({
      roundNumber,
      state: tournamentRoundState({
        draftCount: 0,
        matchStates: matches.map((match) => match.state),
      }),
      startTime: inRound[0]?.startTime ?? null,
      canSwap:
        organizer && !game.cancelledAt && !americanoRoundHasScore(inRound),
      matches,
    });
  }

  const table: AmericanoTableRow[] = americanoTable(
    players.map((player) => player.gamePlayerId),
    americanoResults(rows),
  );

  return {
    isOrganizer: organizer,
    posted: game.drawPostedAt != null,
    roundCount: game.roundCount ?? rounds.length,
    matchMinutes: tournamentMatchMinutes(game.matchMinutes),
    viewerGamePlayerId: viewer?.gamePlayerId ?? null,
    players,
    rounds,
    currentRoundNumber: currentRoundNumber(rounds),
    table,
    finished: americanoDayFinished(rows),
  };
}

export const americanoBoardProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return americanoBoard(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
