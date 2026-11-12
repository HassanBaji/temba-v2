import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  groupMembers,
  groupRatings,
  groupTierPoints,
  groups,
  matchGoals,
  matchResultConfirmations,
  ratings,
} from "@repo/db";

import {
  DEFAULT_FOOTBALL_BIBS,
  footballBalanceStrength,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import type { GroupMemberTierData } from "@repo/domain/group-data";
import { displayedLevelFromMu } from "@repo/domain/level";
import { type LevelBand } from "@repo/domain/level-bands";
import { tierHintReference, tierTable } from "@repo/domain/tier-bands";
import {
  TIER_POINTS_START,
  tierHintFor,
  tierHintOvr,
} from "@repo/domain/tier-points";
import { squadsReadyForScore } from "@repo/domain/matchday-squad";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import { confirmsAsOrganizer } from "#src/games/confirms-as-organizer";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { groupIsVerified } from "#src/groups/group-is-verified";
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
  matchSlotsActedFor,
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

type BoardTier = {
  tier: GroupMemberTierData | null;
  balanceStrength: number;
};

/**
 * Each roster player's Group Tier on a tier Group's Game, and what Make teams
 * balances them on (D15): their Tier points, or while Provisional the start
 * hint their Temba Level gives against the Group's ranked members. Null
 * outside a tier Group. A Provisional member's points are shown only to the
 * viewer themselves and to an Organizer.
 */
async function loadBoardTiers(
  database: DbClient,
  args: {
    groupId: string | null;
    rosterUserIds: readonly string[];
    viewerUserId: string;
    viewerOrganizes: boolean;
  },
): Promise<Map<string, BoardTier> | null> {
  if (!args.groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, args.groupId),
    columns: { id: true, sport: true, verifiedAt: true, venueId: true },
  });
  if (
    !group ||
    !groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })
  ) {
    return null;
  }
  const members = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { userId: true, createdAt: true },
  });
  const rows = await database.query.groupTierPoints.findMany({
    where: eq(groupTierPoints.groupId, group.id),
  });
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const table = tierTable(
    members.map((member) => {
      const row = rowByUser.get(member.userId);
      return {
        userId: member.userId,
        points: row?.points ?? TIER_POINTS_START,
        gamesCounted: row?.gamesCounted ?? 0,
        adjusted: row?.confirmedAt != null,
        joinedAt: member.createdAt,
      };
    }),
  );

  const userIds = [
    ...new Set([
      ...args.rosterUserIds,
      ...members.map((member) => member.userId),
    ]),
  ];
  const levelByUser = new Map<string, number>();
  const groupLevelByUser = new Map<string, number>();
  if (userIds.length > 0) {
    const levelRows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, userIds),
        eq(ratings.sport, "football"),
      ),
      columns: { userId: true, mu: true },
    });
    for (const row of levelRows) {
      levelByUser.set(row.userId, Number(displayedLevelFromMu(row.mu)));
    }
    const groupLevelRows = await database.query.groupRatings.findMany({
      where: and(
        eq(groupRatings.groupId, group.id),
        inArray(groupRatings.userId, userIds),
      ),
      columns: { userId: true, mu: true },
    });
    for (const row of groupLevelRows) {
      groupLevelByUser.set(row.userId, Number(displayedLevelFromMu(row.mu)));
    }
  }
  const ovrOf = (userId: string) =>
    tierHintOvr({
      level: levelByUser.get(userId) ?? null,
      groupLevel: groupLevelByUser.get(userId) ?? null,
    });
  const reference = tierHintReference(
    table.rows.map((row) => ({
      points: row.points,
      provisional: row.provisional,
      ovr: ovrOf(row.userId),
    })),
  );

  const tableRowByUser = new Map(table.rows.map((row) => [row.userId, row]));
  const byUser = new Map<string, BoardTier>();
  for (const userId of args.rosterUserIds) {
    const row = tableRowByUser.get(userId);
    const provisional = row?.provisional ?? true;
    const seesPoints =
      !provisional || args.viewerOrganizes || userId === args.viewerUserId;
    byUser.set(userId, {
      tier: row
        ? {
            band: row.band,
            place: row.place,
            points: seesPoints ? row.points : null,
            provisional: row.provisional,
            gamesOfFive: row.gamesOfFive,
            gamesCounted: row.gamesCounted,
          }
        : null,
      balanceStrength:
        footballBalanceStrength({
          tierPoints: row?.points ?? TIER_POINTS_START,
          tierProvisional: provisional,
          ovrHint: tierHintFor(ovrOf(userId), reference),
        }) ?? TIER_POINTS_START,
    });
  }
  return byUser;
}

/**
 * Everything the football Game screens read beyond `games.byId`: the roster
 * with each player's role, position, Level, Group Tier and team, the two teams
 * and their bibs, the Score with its scorers, and what the viewer may do next.
 */
export async function footballBoard(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  assertFootballGame(game, locale);

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

  const tierByUser = await loadBoardTiers(database, {
    groupId: game.groupId,
    rosterUserIds: userIds,
    viewerUserId: args.userId,
    viewerOrganizes: organizer,
  });

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
  const confirmsFinal =
    organizer && (await confirmsAsOrganizer(database, game, args.userId));
  const viewerSlots = new Set([
    ...(viewerSide != null ? [viewerSide] : []),
    ...(match && !confirmsFinal
      ? await matchSlotsActedFor(database, match, args.userId)
      : []),
  ]);
  const published = sides.slot1 != null && sides.slot2 != null && match != null;
  const challengeSides = await loadChallengeSides(database, game);
  const squadsReady =
    !challengeSides ||
    squadsReadyForScore(challengeSides.map((side) => side.squadState));
  const completed = match?.status === MatchStatusEnum.COMPLETED;
  const live = !game.cancelledAt && !completed;
  const viewerConfirmed = confirmations.some(
    (row) => row.userId === args.userId,
  );
  const viewerSidesConfirmed = [...viewerSlots].every((slot) =>
    slot === 1 ? slotsConfirmed.slot1 : slotsConfirmed.slot2,
  );
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
          balanceStrength: organizer
            ? (tierByUser?.get(row.user.id)?.balanceStrength ?? null)
            : null,
          tier: tierByUser?.get(row.user.id)?.tier ?? null,
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
      canMakeTeams:
        !challengeSides &&
        organizer &&
        live &&
        score == null &&
        userIds.length >= 2,
      canEnterScore:
        published &&
        squadsReady &&
        live &&
        footballScoreOpen(game, now) &&
        (organizer || viewerSide != null),
      canConfirm:
        live &&
        score != null &&
        viewerSlots.size > 0 &&
        !viewerConfirmed &&
        !viewerSidesConfirmed,
      canConfirmAsOrganizer: confirmsFinal && live && score != null,
      canConfirmForSlots:
        confirmsFinal && live && score != null
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
    return footballBoard(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
