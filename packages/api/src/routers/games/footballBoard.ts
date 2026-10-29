import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  matchGoals,
  matchResultConfirmations,
  ratings,
} from "@repo/db";

import {
  DEFAULT_FOOTBALL_BIBS,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { type LevelBand } from "@repo/domain/level-bands";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballGame,
  footballMatch,
  footballScoreOf,
  footballScoreOpen,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";
import {
  matchOrganizerSides,
  matchSlotsConfirmed,
} from "#src/games/match-result-confirmations";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { maskPhone } from "#src/unclaimed-players/mask-phone";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function sideIndexByUser(
  database: DbClient,
  sides: Awaited<ReturnType<typeof footballSides>>,
) {
  const bySide = new Map<string, 1 | 2>();
  for (const [sideIndex, side] of [
    [1, sides.slot1],
    [2, sides.slot2],
  ] as const) {
    if (!side) {
      continue;
    }
    const links = await database.query.gameTeamPlayers.findMany({
      where: eq(gameTeamPlayers.gameTeamId, side.id),
      columns: {},
      with: { gamePlayer: { columns: { userId: true } } },
    });
    for (const link of links) {
      if (link.gamePlayer.userId) {
        bySide.set(link.gamePlayer.userId, sideIndex);
      }
    }
  }
  return bySide;
}

/**
 * Everything the football Game screens read beyond `games.byId`: the roster
 * with each player's role, position, Level and team, the two teams and their
 * bibs, the Score with its scorers, and what the viewer may do next.
 */
export async function footballBoard(
  database: DbClient,
  args: { gameId: string; userId: string },
  now: Date = new Date(),
) {
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  assertFootballGame(game);

  const organizer = await isGameOrganizer(database, game, args.userId);
  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: {
      userId: true,
      footballRole: true,
      footballPosition: true,
      createdAt: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
          phoneNumber: true,
        },
      },
    },
    orderBy: asc(gamePlayers.createdAt),
  });
  const userIds = roster.flatMap((row) => (row.user ? [row.user.id] : []));

  const levelByUser = new Map<string, LevelBand>();
  if (userIds.length > 0) {
    const rows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, userIds),
        eq(ratings.sport, "football"),
      ),
      columns: { userId: true, levelBand: true },
    });
    for (const row of rows) {
      levelByUser.set(row.userId, row.levelBand);
    }
  }

  const sides = await footballSides(database, game.id);
  const sideByUser = await sideIndexByUser(database, sides);
  const match = await footballMatch(database, game.id);
  const score = match
    ? footballScoreOf(await footballScoreSet(database, match.id))
    : null;
  const goals = match
    ? await database.query.matchGoals.findMany({
        where: eq(matchGoals.matchId, match.id),
        columns: { userId: true, goals: true },
      })
    : [];
  const goalsByUser = new Map(goals.map((row) => [row.userId, row.goals]));
  const confirmations = match
    ? await database.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, match.id),
        columns: { userId: true, confirmedAt: true },
        with: { user: { columns: { name: true } } },
        orderBy: asc(matchResultConfirmations.confirmedAt),
      })
    : [];
  const slotsConfirmed = match
    ? await matchSlotsConfirmed(database, match)
    : { slot1: false, slot2: false };
  const organizerSides = match
    ? await matchOrganizerSides(database, match)
    : [];

  const viewerSide = sideByUser.get(args.userId) ?? null;
  const published = sides.slot1 != null && sides.slot2 != null && match != null;
  const completed = match?.status === MatchStatusEnum.COMPLETED;
  const live = !game.cancelledAt && !completed;
  const viewerConfirmed = confirmations.some(
    (row) => row.userId === args.userId,
  );
  const viewerSideConfirmed =
    viewerSide === 1
      ? slotsConfirmed.slot1
      : viewerSide === 2
        ? slotsConfirmed.slot2
        : false;
  const bib = (side: { bib: FootballBib | null } | null, index: 1 | 2) =>
    side?.bib ??
    (index === 1 ? DEFAULT_FOOTBALL_BIBS.slot1 : DEFAULT_FOOTBALL_BIBS.slot2);

  return {
    gameId: game.id,
    sideSize: game.sideSize,
    playersAllowed: game.playersAllowed,
    isOrganizer: organizer,
    players: roster.flatMap((row) => {
      if (!row.user) {
        return [];
      }
      const unclaimed = isUnclaimed(row.user);
      return [
        {
          userId: row.user.id,
          name: row.user.name,
          image: row.user.image,
          role: row.footballRole,
          position: row.footballPosition,
          levelBand: levelByUser.get(row.user.id) ?? null,
          sideIndex: sideByUser.get(row.user.id) ?? null,
          goals: goalsByUser.get(row.user.id) ?? 0,
          isViewer: row.user.id === args.userId,
          unclaimed,
          phoneMasked:
            organizer && unclaimed && row.user.phoneNumber
              ? maskPhone(row.user.phoneNumber)
              : null,
        },
      ];
    }),
    teams: published
      ? {
          method: game.footballTeamsMethod,
          bibs: { slot1: bib(sides.slot1, 1), slot2: bib(sides.slot2, 2) },
        }
      : null,
    match: match
      ? {
          id: match.id,
          status: match.status,
          score,
          confirmed: slotsConfirmed,
          organizerSides,
          enteredByName: confirmations[0]?.user.name ?? null,
        }
      : null,
    viewer: {
      sideIndex: viewerSide,
      canMakeTeams: organizer && live && score == null && userIds.length >= 2,
      canEnterScore:
        published &&
        live &&
        footballScoreOpen(game, now) &&
        (organizer || viewerSide != null),
      canConfirm:
        live &&
        score != null &&
        viewerSide != null &&
        !viewerConfirmed &&
        !viewerSideConfirmed,
      canConfirmAsOrganizer: organizer && live && score != null,
      canConfirmForSlots:
        organizer && live && score != null
          ? organizerSides.flatMap((side) =>
              side.confirmed ? [] : [side.slot],
            )
          : [],
    },
  };
}

export const footballBoardProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return footballBoard(ctx.db, { gameId: input.gameId, userId: appUser.id });
  });
