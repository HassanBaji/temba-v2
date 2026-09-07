import { and, eq, inArray, or } from "drizzle-orm";

import {
  communityMembers,
  gamePlayers,
  groupMembers,
  MatchStatusEnum,
  matches,
  type GroupSportEnum,
} from "@repo/db";

import { pendingLookupInvites as pendingCommunityInvites } from "~/server/api/routers/communities/pendingLookupInvites";
import { pendingLookupInvites as pendingGroupInvites } from "~/server/api/routers/groups/pendingLookupInvites";
import { pendingInvites as pendingTeamInvites } from "~/server/api/routers/teams/pendingInvites";
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
 * Home all-time figures use "Played / Won / Lost" (user-facing). Counts are
 * completed Matches the User sat on via a Game team slot. Cancelled Games do
 * not count. Drawn Matches are played but neither won nor lost, so the three
 * figures do not sum. Sets won remain on the payload for existing callers.
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
  gamesLost: number;
  setsWon: number;
};

const EMPTY_HOME_MATCH_STATS: HomeMatchStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
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

export function summarizeCompletedMatchStats(
  matches: readonly CompletedMatchForStats[],
): HomeMatchStats {
  let gamesWon = 0;
  let gamesLost = 0;
  let setsWon = 0;
  for (const match of matches) {
    const outcome = matchOutcome(match.sets);
    const won =
      match.userSlot === 1
        ? outcome.result === "slot1"
        : outcome.result === "slot2";
    const lost =
      match.userSlot === 1
        ? outcome.result === "slot2"
        : outcome.result === "slot1";
    if (match.userSlot === 1) {
      setsWon += outcome.slot1SetWins;
    } else {
      setsWon += outcome.slot2SetWins;
    }
    if (won) {
      gamesWon += 1;
    }
    if (lost) {
      gamesLost += 1;
    }
  }
  return {
    gamesPlayed: matches.length,
    gamesWon,
    gamesLost,
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
 * Stats (Played / Won / Lost) are completed Matches the User sat on, including
 * zeros when they have not played. Drawn Matches count as played only. The
 * Home carousel is a dedicated live-Game list (Game admit or Organizer), not
 * the My Games hub filter. Soft-archived Club Group Games still appear when
 * live if the viewer qualifies. Standing position is among that Group's
 * members only — not a global rank, and not a heading on the Level surface.
 */
export async function loadHome(database: DbClient, args: { userId: string }) {
  const now = new Date();

  const [communityMemberships, communityInvites, groupInvites, teamInvites] =
    await Promise.all([
      database.query.communityMembers.findMany({
        where: eq(communityMembers.userId, args.userId),
        columns: { id: true },
      }),
      pendingCommunityInvites(database, { userId: args.userId }),
      pendingGroupInvites(database, { userId: args.userId }),
      pendingTeamInvites(database, { userId: args.userId }),
    ]);

  const pendingInviteCount =
    communityInvites.length + groupInvites.length + teamInvites.length;

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
    gamesLost: stats.gamesLost,
    setsWon: stats.setsWon,
    pendingInviteCount,
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
