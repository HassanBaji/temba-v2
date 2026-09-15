import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  games,
  groupMembers,
  GroupTypeEnum,
  ratings,
  type GroupSportEnum,
} from "@repo/db";

import type { LevelBand } from "~/lib/level-bands";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  isStaffRole,
  mayCreateGameOnGroup,
  registrationStatusFromState,
} from "~/server/games/access";
import { groupHasGames } from "~/server/groups/helpers/group-has-games";
import { groupHasNonCreatorMembers } from "~/server/groups/helpers/group-has-non-creator-members";
import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { requireGroup } from "~/server/groups/helpers/require-group";
import {
  groupFormMarks,
  type GroupFormMatch,
} from "~/server/groups/member-form-marks";
import {
  groupMemberWinLoss,
  type GroupWinLossMatch,
} from "~/server/groups/member-win-loss";
import {
  isHomeCarouselNeedsResults,
  type HomeCarouselCandidate,
} from "~/server/home/carousel-games";
import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
  isGameLive,
} from "~/server/home/upcoming-games";
import { isProvisional } from "~/server/ratings/level";
import { consult } from "~/server/soft-archive";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";

type DbClient = typeof db;

const GROUP_GAME_HISTORY_LIMIT = 20;

async function mayDeleteEmptyGroup(args: {
  database: DbClient;
  group: Awaited<ReturnType<typeof requireGroup>>;
  callerId: string;
}) {
  if (args.group.communityId) {
    const membership = await requireCommunityMembership(
      args.database,
      args.group.communityId,
      args.callerId,
    );
    if (!membership || !isStaffRole(membership.role)) {
      return false;
    }
  } else if (args.group.createdBy !== args.callerId) {
    return false;
  }

  if (await groupHasGames(args.database, args.group.id)) {
    return false;
  }

  if (
    await groupHasNonCreatorMembers(
      args.database,
      args.group.id,
      args.group.createdBy,
    )
  ) {
    return false;
  }

  return true;
}

/** A Match slot as the Game teams seat it — `null` before the draw. */
type SlotTeam = {
  players: readonly {
    gamePlayer: { userId: string | null } | null;
  }[];
} | null;

function slotUserIds(team: SlotTeam): string[] {
  const userIds: string[] = [];
  for (const link of team?.players ?? []) {
    const userId = link.gamePlayer?.userId;
    if (userId) {
      userIds.push(userId);
    }
  }
  return userIds;
}

type GroupHomeGameRow = {
  id: string;
  name: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerCents: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  cancelledAt: Date | null;
  createdAt: Date;
  createdBy: string;
  format: string;
  sport: string | null;
  groupId: string | null;
  isPublic: boolean;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  registrationClosedAt: Date | null;
  registrationMode: string;
  venue: { name: string } | null;
  players: {
    userId: string | null;
    user: { name: string; image: string | null } | null;
  }[];
  waitlist: { userId: string | null }[];
  teams: { id: string }[];
  matches: {
    startTime: Date | null;
    status: string | null;
    createdAt: Date;
    court: { name: string } | null;
    slot1GameTeam: SlotTeam;
    slot2GameTeam: SlotTeam;
    sets: {
      slot1GamesWon: number | null;
      slot2GamesWon: number | null;
    }[];
  }[];
};

function toGroupHomeGameCard(
  game: GroupHomeGameRow,
  args: { userId: string; joinFrozen: boolean; now: Date },
) {
  const registeredUserCount = game.players.length;
  const registeredTeamCount = game.teams.length;
  const registrationStatus = registrationStatusFromState(
    game,
    args.now,
    registeredUserCount,
    registeredTeamCount,
    args.joinFrozen,
  );
  const isRegistered = game.players.some(
    (player) => player.userId === args.userId,
  );
  const isWaitlisted = game.waitlist.some((row) => row.userId === args.userId);
  let courtName: string | null = null;
  for (const match of game.matches) {
    if (match.court?.name) {
      courtName = match.court.name;
      break;
    }
  }
  const setScores = game.matches.flatMap((match) =>
    match.sets.flatMap((set) =>
      set.slot1GamesWon != null && set.slot2GamesWon != null
        ? [
            {
              slot1GamesWon: set.slot1GamesWon,
              slot2GamesWon: set.slot2GamesWon,
            },
          ]
        : [],
    ),
  );

  return {
    id: game.id,
    name: game.name,
    startTime: gameListTime(game),
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    pricePerPlayerCents: game.pricePerPlayerCents,
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
    format: game.format,
    cancelledAt: game.cancelledAt,
    sport: game.sport,
    isPublic: game.isPublic,
    venueName: game.venue?.name ?? null,
    courtName,
    registeredUserCount,
    playersAllowed: game.playersAllowed,
    registrationStatus,
    joinFrozen: args.joinFrozen,
    seatedPeople: game.players.flatMap((player) =>
      player.user ? [{ name: player.user.name, image: player.user.image }] : [],
    ),
    isRegistered,
    isWaitlisted,
    setScores: setScores.length > 0 ? setScores : null,
  };
}

export async function groupById(
  database: DbClient,
  args: { groupId: string; userId: string; now?: Date },
) {
  const group = await requireGroup(database, args.groupId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  let communityMembership = null;
  let community = null;

  if (group.communityId) {
    community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
    });
    communityMembership = await requireCommunityMembership(
      database,
      group.communityId,
      args.userId,
    );
  }

  const isLoosePublic =
    !group.communityId && group.type === GroupTypeEnum.PUBLIC;
  const isLoosePrivate =
    !group.communityId && group.type === GroupTypeEnum.PRIVATE;
  const isClubPublic =
    Boolean(group.communityId) && group.type === GroupTypeEnum.PUBLIC;
  const isClubPrivate =
    Boolean(group.communityId) && group.type === GroupTypeEnum.PRIVATE;
  const archive = consult({
    archivedAt: community?.archivedAt ?? null,
  });
  const live = !archive.freeze("join");
  const canJoinClubPublic =
    isClubPublic && Boolean(communityMembership) && !membership && live;
  const canJoinLoosePublic = isLoosePublic && !membership;
  const canJoin = canJoinClubPublic || canJoinLoosePublic;
  const canManageLookupInvites =
    ((isLoosePublic || isLoosePrivate) && group.createdBy === args.userId) ||
    ((isClubPublic || isClubPrivate) &&
      !archive.freeze("host") &&
      Boolean(communityMembership) &&
      (isStaffRole(communityMembership?.role) ||
        group.createdBy === args.userId));
  const canManageInviteLinks =
    ((isLoosePublic || isLoosePrivate) && group.createdBy === args.userId) ||
    ((isClubPublic || isClubPrivate) &&
      !archive.freeze("host") &&
      isStaffRole(communityMembership?.role));

  const canDelete = await mayDeleteEmptyGroup({
    database,
    group,
    callerId: args.userId,
  });
  const canCreateGame = await mayCreateGameOnGroup(
    database,
    group,
    args.userId,
  );

  const memberRows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const memberUserIds = memberRows.map((row) => row.userId);

  const sortedStanding = sortStandingMembers(
    memberRows.map((row) => ({
      userId: row.userId,
      totalSetsWon: row.totalSetsWon,
      totalPointsWon: row.totalPointsWon,
      totalGamesPlayed: row.totalGamesPlayed,
      name: row.user.name,
      image: row.user.image,
      joinedAt: row.createdAt,
    })),
  );

  const viewerStandingPosition = membership
    ? standingPosition(sortedStanding, args.userId)
    : null;

  // "Organizer" on the Members tab: the Group creator, or — on a Club Group —
  // a Community staff member (`.scratch/groups-redesign/spec.md` D8).
  const staffUserIds = new Set<string>();
  if (group.communityId && memberUserIds.length > 0) {
    const communityRoles = await database.query.communityMembers.findMany({
      where: and(
        eq(communityMembers.communityId, group.communityId),
        inArray(communityMembers.userId, memberUserIds),
      ),
      columns: { userId: true, role: true },
    });
    for (const row of communityRoles) {
      if (isStaffRole(row.role)) {
        staffUserIds.add(row.userId);
      }
    }
  }

  // Level reads `ratings` for `(member.userId, group.sport)` — unique on that
  // pair (D5). A Group with no sport has no Rating to read, so every member
  // falls back to the hatched Provisional placeholder.
  const ratingByUserId = new Map<
    string,
    { levelBand: LevelBand; provisional: boolean }
  >();
  if (group.sport && memberUserIds.length > 0) {
    const ratingRows = await database.query.ratings.findMany({
      where: and(
        eq(ratings.sport, group.sport),
        inArray(ratings.userId, memberUserIds),
      ),
      columns: { userId: true, levelBand: true, phi: true },
    });
    for (const row of ratingRows) {
      ratingByUserId.set(row.userId, {
        levelBand: row.levelBand,
        provisional: isProvisional(row.phi),
      });
    }
  }

  const now = args.now ?? new Date();

  // Upcoming / history are scoped by this Group id only (excludes null groupId).
  // Soft-archived Communities are not filtered — members still see Games.
  const groupGameRows = await database.query.games.findMany({
    where: eq(games.groupId, group.id),
    columns: {
      id: true,
      name: true,
      windowStart: true,
      windowEnd: true,
      pricePerPlayerCents: true,
      levelMinTenths: true,
      levelMaxTenths: true,
      cancelledAt: true,
      createdAt: true,
      createdBy: true,
      format: true,
      sport: true,
      groupId: true,
      isPublic: true,
      playersAllowed: true,
      teamsAllowed: true,
      registrationClosedAt: true,
      registrationMode: true,
    },
    with: {
      venue: {
        columns: { name: true },
      },
      players: {
        columns: { userId: true },
        with: {
          user: {
            columns: { name: true, image: true },
          },
        },
      },
      waitlist: {
        columns: { userId: true },
      },
      teams: {
        columns: { id: true },
      },
      matches: {
        columns: {
          startTime: true,
          status: true,
          createdAt: true,
        },
        with: {
          court: {
            columns: { name: true },
          },
          // Slot rosters feed the W-L and form-mark derivations below. They
          // are read, not returned — the response carries no Match rows.
          slot1GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { id: true },
                with: {
                  gamePlayer: { columns: { userId: true } },
                },
              },
            },
          },
          slot2GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { id: true },
                with: {
                  gamePlayer: { columns: { userId: true } },
                },
              },
            },
          },
          sets: {
            columns: {
              slot1GamesWon: true,
              slot2GamesWon: true,
            },
          },
        },
      },
    },
  });

  const joinFrozen = archive.freeze("join");
  const cardArgs = {
    userId: args.userId,
    joinFrozen,
    now,
  };

  const upcomingGames = filterAndSortHomeUpcomingGames(
    groupGameRows,
    new Set([group.id]),
    now,
  ).map((game) => toGroupHomeGameCard(game, cardArgs));

  const gameHistory = groupGameRows
    .filter((game) => {
      if (game.groupId === null || game.groupId !== group.id) {
        return false;
      }
      return !isGameLive(game, now);
    })
    .sort((a, b) => gameListTime(b).getTime() - gameListTime(a).getTime())
    .slice(0, GROUP_GAME_HISTORY_LIMIT)
    .map((game) => toGroupHomeGameCard(game, cardArgs));

  // W-L and form marks derive over the Matches already loaded above
  // (`.scratch/groups-redesign/spec.md` §6.1, §6.2). A cancelled Game never
  // becomes a result, so it is dropped before the derivations see it.
  const winLossMatches: GroupWinLossMatch[] = [];
  const formMatches: GroupFormMatch[] = [];
  for (const game of groupGameRows) {
    if (game.cancelledAt !== null) {
      continue;
    }
    for (const match of game.matches) {
      const occupants = {
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      };
      winLossMatches.push({
        ...occupants,
        status: match.status,
        sets: match.sets,
      });
      formMatches.push({
        ...occupants,
        status: match.status,
        startTime: match.startTime,
        createdAt: match.createdAt,
        sets: match.sets,
      });
    }
  }

  const winLossByUserId = groupMemberWinLoss(winLossMatches, memberUserIds);

  const leaderboard = sortedStanding.map((entry, index) => {
    const record = winLossByUserId.get(entry.userId) ?? { wins: 0, losses: 0 };
    const rating = ratingByUserId.get(entry.userId) ?? null;
    return {
      userId: entry.userId,
      name: entry.name,
      image: entry.image,
      totalSetsWon: entry.totalSetsWon,
      totalPointsWon: entry.totalPointsWon,
      totalGamesPlayed: entry.totalGamesPlayed,
      position: index + 1,
      isViewer: entry.userId === args.userId,
      wins: record.wins,
      losses: record.losses,
      levelBand: rating?.levelBand ?? null,
      levelProvisional: rating?.provisional ?? true,
      formMarks: groupFormMarks(formMatches, entry.userId, now),
      joinedAt: entry.joinedAt,
      isOrganizer:
        entry.userId === group.createdBy || staffUserIds.has(entry.userId),
    };
  });

  // Games whose Matches have started but carry no scored Set, using the
  // `needs_results` rule shape from `~/server/home/carousel-games.ts` (§3.2).
  const awaitingScoreCount = groupGameRows.filter((game) => {
    const candidate: HomeCarouselCandidate = {
      id: game.id,
      groupId: game.groupId,
      cancelledAt: game.cancelledAt,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      createdAt: game.createdAt,
      format: game.format,
      matches: game.matches,
      createdBy: game.createdBy,
      // Neither field is read by isHomeCarouselNeedsResults — this is a
      // Group-wide count, not a viewer-scoped carousel membership list.
      viewerHasGameAdmit: false,
      viewerIsOrganizer: false,
      registrationMode: game.registrationMode,
      playersAllowed: game.playersAllowed,
      teamsAllowed: game.teamsAllowed,
      registeredUserCount: game.players.length,
      registeredTeamCount: game.teams.length,
    };
    return isHomeCarouselNeedsResults(candidate, now);
  }).length;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    type: group.type,
    sport: group.sport as GroupSportEnum | null,
    communityId: group.communityId,
    isLoose: !group.communityId,
    totalGamesPlayed: group.totalGamesPlayed,
    community: community
      ? {
          id: community.id,
          name: community.name,
          archivedAt: community.archivedAt,
        }
      : null,
    isCommunityArchived:
      consult({ archivedAt: community?.archivedAt ?? null }).phase ===
      "archived",
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    membership: membership
      ? {
          id: membership.id,
          totalGamesPlayed: membership.totalGamesPlayed,
          totalSetsWon: membership.totalSetsWon,
          totalPointsWon: membership.totalPointsWon,
          standingPosition: viewerStandingPosition,
        }
      : null,
    standing: {
      memberCount: memberRows.length,
      leaderboard,
      awaitingScoreCount,
    },
    upcomingGames,
    gameHistory,
    communityMembership: communityMembership
      ? { role: communityMembership.role }
      : null,
    canJoin,
    canJoinLoosePublic,
    canJoinClubPublic,
    canManageLookupInvites,
    canManageInviteLinks,
    canDelete,
    canCreateGame,
    memberUserIds,
    hasInviteLink: canManageInviteLinks,
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return groupById(ctx.db, { groupId: input.id, userId: appUser.id });
  });
