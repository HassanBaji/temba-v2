import { and, eq, inArray, or } from "drizzle-orm";

import {
  communityMembers,
  gamePlayers,
  groupMembers,
  MatchStatusEnum,
  matches,
  type GroupSportEnum,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import { listHomeCarouselGames } from "~/server/home/carousel-games";
import {
  sortStandingMembers,
  standingPosition,
} from "~/server/standing/compare-standing";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

/**
 * Home strip labels use "Games played / Games won / Sets won" (user-facing).
 * Counts are completed Matches the User sat on via a Game team slot; Sets won
 * are Set-wins on those Matches. Cancelled Games do not count. Draws are
 * played, not won.
 */
type MatchSetScore = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

type CompletedMatchForStats = {
  userSlot: 1 | 2;
  sets: readonly MatchSetScore[];
};

type HomeMatchStats = {
  gamesPlayed: number;
  gamesWon: number;
  setsWon: number;
};

const EMPTY_HOME_MATCH_STATS: HomeMatchStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  setsWon: 0,
};

function userSlotOnMatch(
  match: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  myGameTeamIds: ReadonlySet<string>,
): 1 | 2 | null {
  const onSlot1 =
    match.slot1GameTeamId != null && myGameTeamIds.has(match.slot1GameTeamId);
  const onSlot2 =
    match.slot2GameTeamId != null && myGameTeamIds.has(match.slot2GameTeamId);
  if (onSlot1 === onSlot2) {
    return null;
  }
  return onSlot1 ? 1 : 2;
}

function summarizeCompletedMatchStats(
  matches: readonly CompletedMatchForStats[],
): HomeMatchStats {
  let gamesWon = 0;
  let setsWon = 0;
  for (const match of matches) {
    const outcome = matchOutcome(match.sets);
    if (match.userSlot === 1) {
      setsWon += outcome.slot1SetWins;
      if (outcome.result === "slot1") {
        gamesWon += 1;
      }
    } else {
      setsWon += outcome.slot2SetWins;
      if (outcome.result === "slot2") {
        gamesWon += 1;
      }
    }
  }
  return {
    gamesPlayed: matches.length,
    gamesWon,
    setsWon,
  };
}

function homeMatchStatsFromCompletedMatches(
  matches: readonly {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    gameCancelled: boolean;
    sets: readonly MatchSetScore[];
  }[],
  myGameTeamIds: ReadonlySet<string>,
): HomeMatchStats {
  const played: CompletedMatchForStats[] = [];
  for (const match of matches) {
    if (match.gameCancelled) {
      continue;
    }
    const userSlot = userSlotOnMatch(match, myGameTeamIds);
    if (userSlot == null) {
      continue;
    }
    played.push({ userSlot, sets: match.sets });
  }
  return summarizeCompletedMatchStats(played);
}

/**
 * Home metrics, carousel Games, and per-Group standing for the signed-in User.
 * Stats (Games played / Games won / Sets won) are completed Matches the User
 * sat on, including zeros when they have not played. The Home carousel is a
 * dedicated live-Game list (Game admit or Organizer), not the My Games hub
 * filter. Soft-archived Club Group Games still appear when live if the viewer
 * qualifies. Standing position is among that Group's members only — not a
 * global rank.
 */
export async function loadHome(database: DbClient, args: { userId: string }) {
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

export const home = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadHome(ctx.db, { userId: appUser.id });
});
