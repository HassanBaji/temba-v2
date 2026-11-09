import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { courts, gameTeams } from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";
import { expectedRoundMatchCount } from "@repo/domain/tournament-pairing";
import {
  currentRoundNumber,
  tournamentMatchState,
  tournamentRoundState,
  type TournamentMatchState,
  type TournamentRoundState,
} from "@repo/domain/tournament-round-state";
import { tournamentMatchMinutes } from "@repo/domain/tournament-sizing";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  assertMakesPoolRounds,
  loadTournamentRoundContext,
  teamPoints,
  type PostedPoolMatch,
} from "#src/games/tournament-round-context";
import { enteredScore } from "#src/games/tournament-score";
import { matchSideSeats } from "#src/games/match-result-confirmations";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TournamentRoundTeam = {
  gameTeamId: string;
  poolIndex: number;
  members: { id: string; name: string; image: string | null }[];
  points: number;
};

export type TournamentRoundMatch = {
  matchId: string | null;
  position: number;
  poolIndex: number | null;
  courtName: string | null;
  startTime: Date | null;
  slot1GameTeamId: string;
  slot2GameTeamId: string;
  state: TournamentMatchState | "draft";
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
  enteredBySlot: 1 | 2 | null;
  enteredByName: string | null;
  standsAt: Date | null;
  viewerSlot: 1 | 2 | null;
  canEnterScore: boolean;
  canConfirm: boolean;
  canMarkNotFinished: boolean;
  canSwap: boolean;
};

export type TournamentRound = {
  roundNumber: number;
  state: TournamentRoundState;
  startTime: Date | null;
  expectedMatchCount: number;
  matches: TournamentRoundMatch[];
};

/**
 * Every Pool Round of a posted draw with each Match's state and what the
 * viewer may do with it. Draft Rounds are the Organizer's alone: everyone
 * else sees them as not made.
 */
export async function tournamentRounds(
  database: DbClient,
  args: { gameId: string; userId: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  assertMakesPoolRounds(game);
  const organizer = await isGameOrganizer(database, game, args.userId);
  const context = await loadTournamentRoundContext(database, game);

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    columns: { id: true, poolIndex: true },
    with: {
      players: {
        with: {
          gamePlayer: {
            with: {
              user: { columns: { id: true, name: true, image: true } },
            },
          },
        },
      },
    },
  });
  const points = teamPoints(context);
  const teams: TournamentRoundTeam[] = teamRows.flatMap((team) =>
    team.poolIndex == null
      ? []
      : [
          {
            gameTeamId: team.id,
            poolIndex: team.poolIndex,
            members: team.players
              .sort((left, right) =>
                (left.position ?? "").localeCompare(right.position ?? ""),
              )
              .flatMap((link) =>
                link.gamePlayer.user ? [link.gamePlayer.user] : [],
              ),
            points: points[team.id] ?? 0,
          },
        ],
  );
  const membersOf = new Map(
    teams.map((team) => [team.gameTeamId, team.members]),
  );
  const viewerTeam = teams.find((team) =>
    team.members.some((member) => member.id === args.userId),
  );

  const courtIds = [
    ...new Set(
      [...context.posted.values()]
        .flat()
        .flatMap((match) => (match.courtId ? [match.courtId] : []))
        .concat(context.courtIds),
    ),
  ];
  const courtRows =
    courtIds.length === 0
      ? []
      : await database.query.courts.findMany({
          where: inArray(courts.id, courtIds),
          columns: { id: true, name: true },
        });
  const courtName = new Map(courtRows.map((court) => [court.id, court.name]));

  async function postedMatch(
    match: PostedPoolMatch,
    position: number,
  ): Promise<TournamentRoundMatch> {
    const slot1 = match.slot1GameTeamId ?? "";
    const slot2 = match.slot2GameTeamId ?? "";
    const outcome = matchOutcome(match.sets);
    const state = tournamentMatchState({
      status: match.status,
      notFinishedAt: match.notFinishedAt,
      hasResult: outcome.result !== "none",
      startTime: match.startTime,
      now,
    });
    const sides = await matchSideSeats(database, match);
    const entered =
      state === "awaiting_confirmation"
        ? await enteredScore(database, match, sides)
        : null;
    const viewerSlot =
      sides.find((side) => side.userIds.includes(args.userId))?.slot ?? null;
    const set = match.sets[0];
    const live =
      state === "on_court" ||
      state === "awaiting_confirmation" ||
      state === "not_finished";
    const enteredByName = entered
      ? (membersOf
          .get(entered.slot === 1 ? slot1 : slot2)
          ?.find((member) => member.id === entered.userId)?.name ?? null)
      : null;
    return {
      matchId: match.id,
      position,
      poolIndex: context.poolOf.get(slot1) ?? null,
      courtName: match.courtId ? (courtName.get(match.courtId) ?? null) : null,
      startTime: match.startTime,
      slot1GameTeamId: slot1,
      slot2GameTeamId: slot2,
      state,
      slot1GamesWon: set?.slot1GamesWon ?? null,
      slot2GamesWon: set?.slot2GamesWon ?? null,
      enteredBySlot: entered?.slot ?? null,
      enteredByName,
      standsAt: entered?.standsAt ?? null,
      viewerSlot,
      canEnterScore:
        (organizer && (live || state === "confirmed")) ||
        (viewerSlot != null && live),
      canConfirm:
        state === "awaiting_confirmation" &&
        ((viewerSlot != null && entered?.slot !== viewerSlot) ||
          (organizer && viewerSlot == null)),
      canMarkNotFinished:
        (organizer || viewerSlot != null) &&
        (state === "on_court" || state === "awaiting_confirmation"),
      canSwap:
        organizer &&
        (state === "scheduled" || state === "on_court") &&
        match.sets.length === 0,
    };
  }

  const rounds: TournamentRound[] = [];
  for (
    let roundNumber = 1;
    roundNumber <= context.roundCount;
    roundNumber += 1
  ) {
    const posted = context.posted.get(roundNumber) ?? [];
    const draft = organizer ? (context.drafts.get(roundNumber) ?? []) : [];
    const slots = context.slots.get(roundNumber) ?? [];
    const matches: TournamentRoundMatch[] =
      posted.length > 0
        ? await Promise.all(posted.map(postedMatch))
        : draft.map((pairing, position) => {
            const slot = slots[position];
            return {
              matchId: null,
              position,
              poolIndex: context.poolOf.get(pairing.slot1GameTeamId) ?? null,
              courtName: slot ? (courtName.get(slot.courtId) ?? null) : null,
              startTime: slot?.startTime ?? null,
              slot1GameTeamId: pairing.slot1GameTeamId,
              slot2GameTeamId: pairing.slot2GameTeamId,
              state: "draft" as const,
              slot1GamesWon: null,
              slot2GamesWon: null,
              enteredBySlot: null,
              enteredByName: null,
              standsAt: null,
              viewerSlot: null,
              canEnterScore: false,
              canConfirm: false,
              canMarkNotFinished: false,
              canSwap: true,
            };
          });
    rounds.push({
      roundNumber,
      state: tournamentRoundState({
        draftCount: draft.length,
        matchStates: matches.flatMap((match) =>
          match.state === "draft" ? [] : [match.state],
        ),
      }),
      startTime: slots[0]?.startTime ?? posted[0]?.startTime ?? null,
      expectedMatchCount: expectedRoundMatchCount(
        context.pools,
        roundNumber,
        context.suggested,
      ),
      matches,
    });
  }

  return {
    isOrganizer: organizer,
    roundCount: context.roundCount,
    suggestedRoundCount: context.suggested,
    poolCount: context.pools.length,
    courtCount: context.courtIds.length,
    matchMinutes: tournamentMatchMinutes(game.matchMinutes),
    viewerGameTeamId: viewerTeam?.gameTeamId ?? null,
    currentRoundNumber: currentRoundNumber(rounds),
    pools: context.pools.map((pool) => ({
      poolIndex: pool.poolIndex,
      gameTeamIds: [...pool.gameTeamIds],
    })),
    teams,
    rounds,
  };
}

export const tournamentRoundsProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return tournamentRounds(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
