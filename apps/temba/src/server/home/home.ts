import { and, eq, inArray, or } from "drizzle-orm";

import {
  communityMembers,
  gamePlayers,
  groupMembers,
  MatchStatusEnum,
  matches,
  type GroupSportEnum,
} from "@repo/db";

import { listHomeCarouselGames } from "~/server/home/carousel-games";
import {
  EMPTY_HOME_MATCH_STATS,
  homeMatchStatsFromCompletedMatches,
} from "~/server/home/match-stats";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";
import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

/**
 * Home metrics, carousel Games, and per-Group standing for the signed-in User.
 * Stats (Games played / Games won / Sets won) are completed Matches the User
 * sat on, including zeros when they have not played. The Home carousel is a
 * dedicated live-Game list (Game admit or Organizer), not the My Games hub
 * filter. Soft-archived Club Group Games still appear when live if the viewer
 * qualifies. Standing position is among that Group's members only — not a
 * global rank.
 */
export async function home(database: DbClient, args: { userId: string }) {
  const now = new Date();

  const communityMemberships = await database.query.communityMembers.findMany({
    where: eq(communityMembers.userId, args.userId),
    columns: { id: true },
  });

  const myGroupMemberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: true,
    },
  });

  const groupIds = myGroupMemberships.map((row) => row.groupId);

  const peerRows =
    groupIds.length === 0
      ? []
      : await database.query.groupMembers.findMany({
          where: inArray(groupMembers.groupId, groupIds),
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        });

  const peersByGroup = new Map<string, typeof peerRows>();
  for (const row of peerRows) {
    const list = peersByGroup.get(row.groupId) ?? [];
    list.push(row);
    peersByGroup.set(row.groupId, list);
  }

  const standing = myGroupMemberships
    .map((membership) => {
      const peers = peersByGroup.get(membership.groupId) ?? [];
      const sorted = sortStandingMembers(
        peers.map((peer) => ({
          userId: peer.userId,
          totalSetsWon: peer.totalSetsWon,
          totalPointsWon: peer.totalPointsWon,
          totalGamesPlayed: peer.totalGamesPlayed,
          name: peer.user.name,
        })),
      );
      const position = standingPosition(sorted, args.userId);

      return {
        groupId: membership.group.id,
        groupName: membership.group.name,
        sport: membership.group.sport as GroupSportEnum | null,
        position: position ?? 1,
        memberCount: peers.length,
      };
    })
    .sort((a, b) =>
      (a.groupName ?? "").localeCompare(b.groupName ?? "", undefined, {
        sensitivity: "base",
      }),
    );

  const carouselGames = await listHomeCarouselGames(database, args.userId, now);

  const myPlayerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, args.userId),
    columns: { id: true },
    with: {
      gameTeamPlayers: {
        columns: { gameTeamId: true },
      },
    },
  });
  const myGameTeamIds = [
    ...new Set(
      myPlayerRows.flatMap((row) =>
        row.gameTeamPlayers.map((link) => link.gameTeamId),
      ),
    ),
  ];

  let stats = EMPTY_HOME_MATCH_STATS;
  if (myGameTeamIds.length > 0) {
    const completedMatches = await database.query.matches.findMany({
      where: and(
        eq(matches.status, MatchStatusEnum.COMPLETED),
        or(
          inArray(matches.slot1GameTeamId, myGameTeamIds),
          inArray(matches.slot2GameTeamId, myGameTeamIds),
        ),
      ),
      columns: {
        slot1GameTeamId: true,
        slot2GameTeamId: true,
      },
      with: {
        game: {
          columns: { cancelledAt: true },
        },
        sets: {
          columns: {
            slot1GamesWon: true,
            slot2GamesWon: true,
          },
        },
      },
    });
    stats = homeMatchStatsFromCompletedMatches(
      completedMatches.map((match) => ({
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        gameCancelled: match.game?.cancelledAt != null,
        sets: match.sets,
      })),
      new Set(myGameTeamIds),
    );
  }

  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    setsWon: stats.setsWon,
    communitiesCount: communityMemberships.length,
    groupsCount: myGroupMemberships.length,
    carouselGames,
    standing,
  };
}
