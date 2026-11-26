import { TRPCError } from "@trpc/server";
import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupTierEvents,
  groups,
  matchGoals,
  matchSets,
  matches,
} from "@repo/db";

import { groupHasTier } from "@repo/domain/game-rating-scope";
import {
  groupFormMarks,
  type FormMark,
  type GroupFormMatch,
} from "@repo/domain/member-form-marks";
import {
  zonedDateTimeToInstant,
  zonedParts,
} from "@repo/domain/product-timezone";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertFootballGame } from "#src/games/football-lineup";
import { groupIsVerified } from "#src/groups/group-is-verified";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FootballPlayerCard = {
  games: number;
  goals: number;
  mvps: number;
  /** The last five results, oldest first; fewer when fewer were played. */
  form: FormMark[];
  /** What the player's Tier points moved this month; null outside a tier Group. */
  pointsThisMonth: number | null;
};

function startOfProductMonth(now: Date) {
  const { year, month } = zonedParts(now);
  return zonedDateTimeToInstant({ year, month, day: 1 });
}

async function isTierGroup(database: DbClient, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, sport: true, verifiedAt: true, venueId: true },
  });
  return (
    group != null &&
    groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })
  );
}

/**
 * The short profile Make teams opens on one player of the pool: their football
 * Games, goals and MVPs in the Game's Group, their last five results there and
 * what their Tier points moved this month. A Game outside a Group reads the
 * player's football Games anywhere. Only the Game's Organizers may read it,
 * and only for a player on the roster.
 */
export async function footballPlayerCard(
  database: DbClient,
  args: {
    gameId: string;
    viewerUserId: string;
    userId: string;
    locale?: Locale;
  },
  now: Date = new Date(),
): Promise<FootballPlayerCard> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).game.errors;
  const game = await requireGame(database, args.gameId, locale);
  assertFootballGame(game, locale);
  if (!(await isGameOrganizer(database, game, args.viewerUserId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: m.organizerOnly });
  }
  const seated = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, game.id),
      eq(gamePlayers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!seated) {
    throw new TRPCError({ code: "NOT_FOUND", message: m.notFound });
  }

  const inScope: SQL[] = [
    eq(games.sport, "football"),
    isNull(games.cancelledAt),
    ...(game.groupId ? [eq(games.groupId, game.groupId)] : []),
  ];

  const seats = await database
    .select({
      matchId: matches.id,
      status: matches.status,
      startTime: matches.startTime,
      createdAt: matches.createdAt,
      slot: sql<
        1 | 2
      >`case when ${matches.slot1GameTeamId} = ${gameTeams.id} then 1 else 2 end`,
    })
    .from(gameTeamPlayers)
    .innerJoin(gamePlayers, eq(gameTeamPlayers.gamePlayerId, gamePlayers.id))
    .innerJoin(gameTeams, eq(gameTeamPlayers.gameTeamId, gameTeams.id))
    .innerJoin(games, eq(gameTeams.gameId, games.id))
    .innerJoin(
      matches,
      or(
        eq(matches.slot1GameTeamId, gameTeams.id),
        eq(matches.slot2GameTeamId, gameTeams.id),
      ),
    )
    .where(and(eq(gamePlayers.userId, args.userId), ...inScope));

  const matchIds = seats.map((seat) => seat.matchId);
  const sets =
    matchIds.length === 0
      ? []
      : await database
          .select({
            matchId: matchSets.matchId,
            slot1GamesWon: matchSets.slot1GamesWon,
            slot2GamesWon: matchSets.slot2GamesWon,
          })
          .from(matchSets)
          .where(inArray(matchSets.matchId, matchIds));
  const formMatches: GroupFormMatch[] = seats.map((seat) => ({
    slot1UserIds: Number(seat.slot) === 1 ? [args.userId] : [],
    slot2UserIds: Number(seat.slot) === 2 ? [args.userId] : [],
    status: seat.status,
    startTime: seat.startTime,
    createdAt: seat.createdAt,
    sets: sets.filter((set) => set.matchId === seat.matchId),
  }));

  const completedIds = seats
    .filter((seat) => seat.status === MatchStatusEnum.COMPLETED)
    .map((seat) => seat.matchId);
  const [goals] =
    completedIds.length === 0
      ? [{ total: 0 }]
      : await database
          .select({ total: sql<number>`coalesce(sum(${matchGoals.goals}), 0)` })
          .from(matchGoals)
          .where(
            and(
              eq(matchGoals.userId, args.userId),
              inArray(matchGoals.matchId, completedIds),
            ),
          );

  const [mvps] = await database
    .select({ total: sql<number>`count(*)` })
    .from(games)
    .where(
      and(
        eq(games.mvpUserId, args.userId),
        isNotNull(games.mvpSettledAt),
        ...inScope,
      ),
    );

  let pointsThisMonth: number | null = null;
  if (game.groupId && (await isTierGroup(database, game.groupId))) {
    const [moved] = await database
      .select({
        total: sql<number>`coalesce(sum(${groupTierEvents.delta}), 0)`,
      })
      .from(groupTierEvents)
      .where(
        and(
          eq(groupTierEvents.groupId, game.groupId),
          eq(groupTierEvents.userId, args.userId),
          gte(groupTierEvents.createdAt, startOfProductMonth(now)),
        ),
      );
    pointsThisMonth = Number(moved?.total ?? 0);
  }

  return {
    games: completedIds.length,
    goals: Number(goals?.total ?? 0),
    mvps: Number(mvps?.total ?? 0),
    form: groupFormMarks(formMatches, args.userId, now),
    pointsThisMonth,
  };
}

export const footballPlayerCardProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid(), userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return footballPlayerCard(ctx.db, {
      gameId: input.gameId,
      viewerUserId: appUser.id,
      userId: input.userId,
      locale: ctx.locale,
    });
  });
