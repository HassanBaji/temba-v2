import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  communityMembers,
  games,
  groupMembers,
  GroupTypeEnum,
  MatchStatusEnum,
  ratings,
  type GroupSportEnum,
} from "@repo/db";

import type { LevelBand } from "~/lib/level-bands";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isStaffRole, mayCreateGameOnGroup } from "~/server/games/access";
import {
  applyViewerLevelRangeToHubRows,
  hubListColumns,
  hubListWith,
  toHubListRow,
  viewerHubContext,
} from "~/server/games/helpers/hub-list";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  outcomeForSlot,
  scoredSetsFromMatch,
  seatedUserSlotOnMatch,
  slotMembers,
  type MatchSlotMember,
} from "~/server/games/match-slots";
import { groupHasGames } from "~/server/groups/helpers/group-has-games";
import { groupHasNonCreatorMembers } from "~/server/groups/helpers/group-has-non-creator-members";
import { groupJoinMode } from "~/server/groups/helpers/group-join-mode";
import { isGroupApprover } from "~/server/groups/helpers/is-group-approver";
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
type GroupSlotTeam = {
  players: readonly {
    position: string | null;
    gamePlayer: {
      userId: string | null;
      user: { id: string; name: string; image: string | null } | null;
    } | null;
  }[];
} | null;

function slotUserIds(team: GroupSlotTeam): string[] {
  const userIds: string[] = [];
  for (const link of team?.players ?? []) {
    const userId = link.gamePlayer?.userId;
    if (userId) {
      userIds.push(userId);
    }
  }
  return userIds;
}

/**
 * One row of the Games tab Played list (design 06b, spec §4.2): the slot
 * rosters, the scored Sets, and the slot the viewer sat on — `null` when they
 * did not play. Same fields `games.listMyMatchHistory` returns, read from the
 * same shared slot derivation.
 */
export type GroupPlayedGame = {
  id: string;
  name: string | null;
  venueName: string | null;
  displayTime: Date;
  cancelled: boolean;
  slot1Members: MatchSlotMember[];
  slot2Members: MatchSlotMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2 | null;
  outcome: "won" | "lost" | "draw" | null;
};

type GroupGameMatch = {
  id: string;
  startTime: Date | null;
  status: string | null;
  createdAt: Date;
  slot1GameTeam: GroupSlotTeam;
  slot2GameTeam: GroupSlotTeam;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

/**
 * The Match a past Game reads as: the latest one the viewer sat on, so the
 * row speaks about their own result, and otherwise the latest Match on the
 * Game, so a Game they did not play in still shows both teams and the score.
 */
function playedMatchForViewer(
  matches: readonly GroupGameMatch[],
  userId: string,
): { match: GroupGameMatch; viewerSlot: 1 | 2 | null } | null {
  const sorted = [...matches].sort((a, b) => {
    const left = a.startTime?.getTime() ?? a.createdAt.getTime();
    const right = b.startTime?.getTime() ?? b.createdAt.getTime();
    if (left !== right) {
      return right - left;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  for (const match of sorted) {
    const viewerSlot = seatedUserSlotOnMatch(
      {
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      },
      userId,
    );
    if (viewerSlot != null) {
      return { match, viewerSlot };
    }
  }
  const fallback = sorted[0];
  return fallback ? { match: fallback, viewerSlot: null } : null;
}

function toGroupPlayedGame(
  game: {
    id: string;
    name: string | null;
    groupId: string | null;
    cancelledAt: Date | null;
    windowStart: Date | null;
    windowEnd: Date | null;
    createdAt: Date;
    format: string;
    venue: { name: string } | null;
    matches: readonly GroupGameMatch[];
  },
  userId: string,
): GroupPlayedGame {
  const played = playedMatchForViewer(game.matches, userId);
  const viewerSlot = played?.viewerSlot ?? null;
  const scoredSets = played ? scoredSetsFromMatch(played.match.sets) : [];
  // Only a completed Match is a result. A Match awaiting result confirmation
  // (ADR-0011) still shows its score, but reads as no result — the same rule
  // `groupFormMarks` applies to the marks on the other tabs.
  const outcome =
    played &&
    viewerSlot != null &&
    played.match.status === MatchStatusEnum.COMPLETED
      ? outcomeForSlot(viewerSlot, matchOutcome(played.match.sets).result)
      : null;

  return {
    id: game.id,
    name: game.name,
    venueName: game.venue?.name ?? null,
    displayTime: played?.match.startTime ?? gameListTime(game),
    cancelled: game.cancelledAt !== null,
    slot1Members: played ? slotMembers(played.match.slot1GameTeam, userId) : [],
    slot2Members: played ? slotMembers(played.match.slot2GameTeam, userId) : [],
    scoredSets,
    viewerSlot,
    outcome,
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
  const joinMode = await groupJoinMode(database, group, args.userId);
  const canJoinClubPublic = joinMode === "join" && isClubPublic;
  const canJoinLoosePublic = joinMode === "join" && isLoosePublic;
  const canJoin = joinMode === "join";
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
  const isApprover = await isGroupApprover(database, group, args.userId);
  const canSetRequiresApproval =
    isApprover && group.type === GroupTypeEnum.PUBLIC;
  const canDecideJoinRequests = canSetRequiresApproval;

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
    // The Scheduled cards are the Games hub's own rows, so this reads the hub
    // column set (`~/server/games/helpers/hub-list`) and hands it to the same
    // `toHubListRow`. Matches carry their slot rosters and Sets on top, for
    // the W-L, form-mark and Played derivations below (spec §4, §6).
    columns: hubListColumns,
    with: {
      ...hubListWith,
      matches: {
        columns: {
          id: true,
          gameId: true,
          startTime: true,
          status: true,
          createdAt: true,
          slot1GameTeamId: true,
          slot2GameTeamId: true,
        },
        with: {
          slot1GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { position: true },
                with: {
                  gamePlayer: {
                    columns: { userId: true },
                    with: {
                      user: { columns: { id: true, name: true, image: true } },
                    },
                  },
                },
              },
            },
          },
          slot2GameTeam: {
            columns: { id: true },
            with: {
              players: {
                columns: { position: true },
                with: {
                  gamePlayer: {
                    columns: { userId: true },
                    with: {
                      user: { columns: { id: true, name: true, image: true } },
                    },
                  },
                },
              },
            },
          },
          sets: {
            columns: {
              slot1GamesWon: true,
              slot2GamesWon: true,
            },
            orderBy: (table, { asc }) => [asc(table.setNumber)],
          },
        },
      },
    },
  });

  // Scheduled cards are `GameSummaryCard`, the Games hub card, so the rows it
  // reads are built by the hub's own `toHubListRow` — one shape, not two
  // (spec §4.1). The viewer's Level range gates `canRegister` here exactly as
  // it does on the hub.
  const viewer = await viewerHubContext(database, args.userId);
  const upcomingRows = filterAndSortHomeUpcomingGames(
    groupGameRows,
    new Set([group.id]),
    now,
  );
  const upcomingGames = await applyViewerLevelRangeToHubRows(
    database,
    upcomingRows.map((row) => toHubListRow(row, viewer, now)),
    upcomingRows,
    args.userId,
  );

  const gameHistory = groupGameRows
    .filter((game) => {
      if (game.groupId === null || game.groupId !== group.id) {
        return false;
      }
      return !isGameLive(game, now);
    })
    .sort((a, b) => gameListTime(b).getTime() - gameListTime(a).getTime())
    .slice(0, GROUP_GAME_HISTORY_LIMIT)
    .map((game) => toGroupPlayedGame(game, args.userId));

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

  const totalGamesPlayed = groupGameRows.filter((game) => {
    if (game.cancelledAt !== null) {
      return false;
    }
    return game.matches.some(
      (match) => match.status === MatchStatusEnum.COMPLETED,
    );
  }).length;
  const leaderboard = sortedStanding.map((entry, index) => {
    const record = winLossByUserId.get(entry.userId) ?? { wins: 0, losses: 0 };
    const rating = ratingByUserId.get(entry.userId) ?? null;
    return {
      userId: entry.userId,
      name: entry.name,
      image: entry.image,
      totalSetsWon: entry.totalSetsWon,
      totalPointsWon: entry.totalPointsWon,
      totalGamesPlayed: totalGamesPlayed,
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
    imageUrl: group.imageUrl ?? null,
    type: group.type,
    sport: group.sport as GroupSportEnum | null,
    communityId: group.communityId,
    isLoose: !group.communityId,
    totalGamesPlayed,
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
    joinMode,
    requiresApproval: group.requiresApproval,
    canDecideJoinRequests,
    canSetRequiresApproval,
    canManageLookupInvites,
    canManageInviteLinks,
    canDelete,
    canCreateGame,
    canManageImage: isApprover,
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
