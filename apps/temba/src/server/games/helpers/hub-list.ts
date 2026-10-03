import { asc, eq, inArray, or, type SQL } from "drizzle-orm";

import {
  gamePlayers,
  gameWaitlist,
  groupMembers,
  matchSets,
  teamMembers,
} from "@repo/db";

import { poolLetter } from "~/lib/tournament-knockout";
import {
  knockoutChampion,
  knockoutCurrentRound,
  postedKnockoutRounds,
} from "~/lib/tournament-knockout-view";
import {
  hasKnockout,
  hasPools,
  isDrawnTournament,
  isPartnerRequiredGame,
  plannedKnockoutRoundCount,
  plannedTournamentRoundCount,
  postedRoundCount,
} from "~/lib/tournament-rounds";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  computePoolTables,
  type ViewerRoundResult,
} from "~/server/games/pool-table";
import { registrationStatusFromState } from "~/server/games/access";
import { type db } from "~/server/db";
import { gameListTime } from "~/server/home/upcoming-games";
import { consult } from "~/server/soft-archive";
import type { TestDatabase } from "~/server/test/pglite";
import type {
  HubListPoolMatch,
  HubListRow,
  HubListSide,
  HubListSideOccupant,
  HubListTournament,
  HubListTournamentKnockout,
  HubListTournamentTeam,
} from "~/server/games/utils";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";

export type HubListDb = typeof db | TestDatabase;

export const hubListColumns = {
  id: true,
  name: true,
  isPublic: true,
  groupId: true,
  venueId: true,
  windowStart: true,
  windowEnd: true,
  pricePerPlayerCents: true,
  levelMinTenths: true,
  levelMaxTenths: true,
  cancelledAt: true,
  registrationClosedAt: true,
  createdAt: true,
  createdBy: true,
  format: true,
  registrationMode: true,
  sport: true,
  playersAllowed: true,
  teamsAllowed: true,
  poolCount: true,
  tournamentShape: true,
  qualifiersPerPool: true,
  roundCount: true,
  allowSoloRegister: true,
  drawPostedAt: true,
} as const;

export const hubListWith = {
  group: {
    columns: {
      id: true,
      communityId: true,
      name: true,
    },
    with: {
      community: {
        columns: {
          archivedAt: true,
        },
      },
    },
  },
  venue: {
    columns: {
      id: true,
      name: true,
      city: true,
    },
  },
  matches: {
    columns: {
      id: true,
      gameId: true,
      startTime: true,
      status: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
      roundNumber: true,
      knockoutRound: true,
      knockoutPosition: true,
      walkoverGameTeamId: true,
      courtId: true,
    },
    with: {
      court: {
        columns: {
          name: true,
        },
      },
      sets: {
        columns: {
          slot1GamesWon: true,
          slot2GamesWon: true,
        },
        orderBy: asc(matchSets.setNumber),
      },
    },
  },
  players: {
    columns: {
      id: true,
      userId: true,
    },
  },
  waitlist: {
    columns: {
      userId: true,
      teamId: true,
    },
  },
  teams: {
    columns: {
      id: true,
      sideIndex: true,
      poolIndex: true,
    },
    with: {
      players: {
        columns: {
          position: true,
        },
        with: {
          gamePlayer: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type HubQueryRow = {
  id: string;
  name: string | null;
  isPublic: boolean;
  groupId: string | null;
  venueId: string;
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerCents: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  format: string;
  registrationMode: string;
  sport: string | null;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  poolCount: number | null;
  tournamentShape: string | null;
  qualifiersPerPool: number | null;
  roundCount: number | null;
  allowSoloRegister: boolean;
  drawPostedAt: Date | null;
  group: {
    id: string;
    communityId: string | null;
    /** Nullable on `groups`; hub rows carry `groupName: null` for an unnamed Group. */
    name: string | null;
    community: { archivedAt: Date | null } | null;
  } | null;
  venue: { id: string; name: string; city: string } | null;
  matches: {
    id: string;
    gameId: string;
    startTime: Date | null;
    status: string | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    roundNumber: number | null;
    knockoutRound: number | null;
    knockoutPosition: number | null;
    walkoverGameTeamId: string | null;
    courtId: string | null;
    court: { name: string } | null;
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  }[];
  players: { id: string; userId: string | null }[];
  waitlist: { userId: string | null; teamId: string | null }[];
  teams: {
    id: string;
    sideIndex: number | null;
    poolIndex: number | null;
    players: {
      position: "left" | "right" | null;
      gamePlayer: {
        user: { id: string; name: string; image: string | null } | null;
      } | null;
    }[];
  }[];
};

export async function viewerHubContext(database: HubListDb, userId: string) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    columns: { groupId: true },
  });
  const teams = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  return {
    userId,
    memberGroupIds: new Set(memberships.map((row) => row.groupId)),
    myTeamIds: new Set(teams.map((row) => row.teamId)),
  };
}

function occupantFromLink(
  link: HubQueryRow["teams"][number]["players"][number],
  viewerUserId: string,
): HubListSideOccupant | null {
  const user = link.gamePlayer?.user;
  if (!user) {
    return null;
  }
  return {
    userId: user.id,
    name: user.name,
    image: user.image,
    isViewer: user.id === viewerUserId,
  };
}

function teamOccupants(
  team: HubQueryRow["teams"][number] | undefined,
  viewerUserId: string,
) {
  let left: HubListSideOccupant | null = null;
  let right: HubListSideOccupant | null = null;
  for (const link of team?.players ?? []) {
    const occupant = occupantFromLink(link, viewerUserId);
    if (!occupant) {
      continue;
    }
    if (link.position === "left") {
      left = occupant;
    } else if (link.position === "right") {
      right = occupant;
    }
  }
  return { left, right };
}

function sidesBySideIndex(
  row: HubQueryRow,
  viewerUserId: string,
  sideCount: number,
): HubListSide[] {
  const bySide = new Map<number, HubQueryRow["teams"][number]>();
  for (const team of row.teams) {
    if (team.sideIndex != null) {
      bySide.set(team.sideIndex, team);
    }
  }
  const sides: HubListSide[] = [];
  for (let sideIndex = 1; sideIndex <= sideCount; sideIndex += 1) {
    sides.push({
      sideIndex,
      ...teamOccupants(bySide.get(sideIndex), viewerUserId),
    });
  }
  return sides;
}

function sidesFromRow(row: HubQueryRow, viewerUserId: string): HubListSide[] {
  if (row.format !== "friendly_game" || row.registrationMode !== "individual") {
    return [];
  }
  return sidesBySideIndex(row, viewerUserId, 2);
}

function tournamentTeamsFromRow(
  row: HubQueryRow,
  viewerUserId: string,
): HubListTournamentTeam[] {
  const teams: HubListTournamentTeam[] = [];
  for (const team of row.teams) {
    const { left, right } = teamOccupants(team, viewerUserId);
    if (!left && !right) {
      continue;
    }
    teams.push({
      gameTeamId: team.id,
      sideIndex: team.sideIndex,
      poolIndex: team.poolIndex,
      isViewerTeam: left?.isViewer === true || right?.isViewer === true,
      left,
      right,
    });
  }
  return teams.sort((a, b) => {
    if (a.isViewerTeam !== b.isViewerTeam) {
      return a.isViewerTeam ? -1 : 1;
    }
    return (
      (a.sideIndex ?? Number.MAX_SAFE_INTEGER) -
      (b.sideIndex ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function tournamentFromRow(
  row: HubQueryRow,
  viewerUserId: string,
): HubListTournament | null {
  if (!isDrawnTournament(row.format, row.poolCount, row.tournamentShape)) {
    return null;
  }
  const drawPosted = row.drawPostedAt != null;
  return {
    roundCount: drawPosted
      ? poolRoundCount(row)
      : plannedTournamentRoundCount(row),
    drawPosted,
    allowSoloRegister: row.allowSoloRegister,
    teams: tournamentTeamsFromRow(row, viewerUserId),
    joinSides: sidesBySideIndex(row, viewerUserId, row.teamsAllowed ?? 0),
    knockout: tournamentKnockoutFromRow(row, viewerUserId),
  };
}

function knockoutRoundsFromRow(row: HubQueryRow, viewerUserId: string) {
  return postedKnockoutRounds({
    viewerUserId,
    gameTeams: row.teams.map((team) => ({
      id: team.id,
      name: null,
      members: team.players.flatMap((link) => {
        const user = link.gamePlayer?.user;
        return user ? [{ id: user.id, name: user.name }] : [];
      }),
    })),
    matches: row.matches.map((match) => ({
      id: match.id,
      knockoutRound: match.knockoutRound,
      knockoutPosition: match.knockoutPosition,
      startTime: match.startTime,
      courtName: match.court?.name ?? null,
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
      status: match.status,
      result: matchOutcome(match.sets).result,
      walkoverGameTeamId: match.walkoverGameTeamId,
    })),
  });
}

function tournamentKnockoutFromRow(
  row: HubQueryRow,
  viewerUserId: string,
): HubListTournamentKnockout | null {
  if (!hasKnockout(row.format, row.tournamentShape)) {
    return null;
  }
  const rounds =
    row.drawPostedAt != null ? knockoutRoundsFromRow(row, viewerUserId) : null;
  if (!rounds) {
    return {
      roundCount: plannedKnockoutRoundCount(row),
      currentRoundName: null,
      champion: null,
    };
  }
  return {
    roundCount: rounds.length,
    currentRoundName: knockoutCurrentRound(rounds)?.name ?? null,
    champion: knockoutChampion(rounds)?.name ?? null,
  };
}

function userPassesHubJoinGate(
  row: HubQueryRow,
  userId: string,
  memberGroupIds: ReadonlySet<string>,
) {
  if (row.isPublic) {
    return true;
  }
  if (row.groupId) {
    return memberGroupIds.has(row.groupId);
  }
  return row.createdBy === userId;
}

export function viewerParticipation(
  row: HubQueryRow,
  viewer: {
    userId: string;
    myTeamIds: ReadonlySet<string>;
  },
) {
  const isRegistered = row.players.some(
    (player) => player.userId === viewer.userId,
  );
  const isWaitlisted = row.waitlist.some(
    (entry) =>
      entry.userId === viewer.userId ||
      (entry.teamId != null && viewer.myTeamIds.has(entry.teamId)),
  );
  const isSeated = row.teams.some((team) =>
    team.players.some((link) => link.gamePlayer?.user?.id === viewer.userId),
  );
  return { isRegistered, isWaitlisted, isSeated };
}

export function viewerIsParticipantOnRow(
  row: HubQueryRow,
  viewer: {
    userId: string;
    myTeamIds: ReadonlySet<string>;
  },
) {
  const participation = viewerParticipation(row, viewer);
  return (
    participation.isRegistered ||
    participation.isWaitlisted ||
    participation.isSeated
  );
}

export async function participantGameIdsForViewer(
  database: HubListDb,
  userId: string,
  myTeamIds: ReadonlySet<string>,
) {
  const players = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { gameId: true },
  });
  const waitlistWhere =
    myTeamIds.size === 0
      ? eq(gameWaitlist.userId, userId)
      : or(
          eq(gameWaitlist.userId, userId),
          inArray(gameWaitlist.teamId, [...myTeamIds]),
        );
  const waitlisted = await database.query.gameWaitlist.findMany({
    where: waitlistWhere,
    columns: { gameId: true },
  });
  return new Set([
    ...players.map((row) => row.gameId),
    ...waitlisted.map((row) => row.gameId),
  ]);
}

export function toHubListRow(
  row: HubQueryRow,
  viewer: {
    userId: string;
    memberGroupIds: ReadonlySet<string>;
    myTeamIds: ReadonlySet<string>;
  },
  now: Date,
): HubListRow {
  const joinFrozen = consult({
    archivedAt: row.group?.community?.archivedAt ?? null,
  }).freeze("join");
  const registeredUserCount = row.players.length;
  const registeredTeamCount = row.teams.length;
  const { isRegistered, isWaitlisted, isSeated } = viewerParticipation(
    row,
    viewer,
  );
  const registrationStatus = registrationStatusFromState(
    row,
    now,
    registeredUserCount,
    registeredTeamCount,
    joinFrozen,
  );
  const passesGate = userPassesHubJoinGate(
    row,
    viewer.userId,
    viewer.memberGroupIds,
  );
  const candidate = {
    id: row.id,
    groupId: row.groupId,
    cancelledAt: row.cancelledAt,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    createdAt: row.createdAt,
    format: row.format,
    matches: row.matches,
  };

  return {
    id: row.id,
    name: row.name,
    format: row.format,
    registrationMode: row.registrationMode,
    sport: row.sport,
    isPublic: row.isPublic,
    groupId: row.groupId,
    groupName: row.group?.name ?? null,
    startTime: gameListTime(candidate),
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    venue: row.venue
      ? {
          id: row.venue.id,
          name: row.venue.name,
          city: row.venue.city,
        }
      : null,
    pricePerPlayerCents: row.pricePerPlayerCents,
    levelMinTenths: row.levelMinTenths,
    levelMaxTenths: row.levelMaxTenths,
    registeredUserCount,
    playersAllowed: row.playersAllowed,
    registeredTeamCount,
    teamsAllowed: row.teamsAllowed,
    registrationStatus,
    joinFrozen,
    isRegistered,
    isSeated,
    isWaitlisted,
    canRegister:
      registrationStatus === "open" &&
      passesGate &&
      !isRegistered &&
      !isWaitlisted,
    canWaitlist:
      !isPartnerRequiredGame(row) &&
      registrationStatus === "full" &&
      passesGate &&
      !isRegistered &&
      !isWaitlisted,
    sides: sidesFromRow(row, viewer.userId),
    poolCount: row.poolCount,
    tournamentShape: row.tournamentShape,
    tournament: tournamentFromRow(row, viewer.userId),
    matchId: null,
    roundNumber: null,
    roundCount: null,
    courtName: null,
    poolMatch: null,
    knockoutMatch: null,
  };
}

function sidesFromMatch(
  row: HubQueryRow,
  match: HubQueryRow["matches"][number],
  viewerUserId: string,
): HubListSide[] {
  function sideForTeam(teamId: string | null, sideIndex: number): HubListSide {
    const team = row.teams.find((item) => item.id === teamId);
    return { sideIndex, ...teamOccupants(team, viewerUserId) };
  }
  return [
    sideForTeam(match.slot1GameTeamId, 1),
    sideForTeam(match.slot2GameTeamId, 2),
  ];
}

function poolRoundCount(row: HubQueryRow) {
  return postedRoundCount(row.matches);
}

function viewerSitsOnMatch(
  row: HubQueryRow,
  match: HubQueryRow["matches"][number],
  userId: string,
) {
  return row.teams.some(
    (team) =>
      (team.id === match.slot1GameTeamId ||
        team.id === match.slot2GameTeamId) &&
      team.players.some((link) => link.gamePlayer?.user?.id === userId),
  );
}

function isOpenMatch(match: HubQueryRow["matches"][number]) {
  return match.status !== "completed" && match.status !== "cancelled";
}

function viewerPoolMatch(
  row: HubQueryRow,
  viewerUserId: string,
): HubListPoolMatch | null {
  const tables = computePoolTables({
    format: row.format,
    poolCount: row.poolCount,
    viewerUserId,
    gameTeams: row.teams.map((team) => ({
      id: team.id,
      name: null,
      sideIndex: team.sideIndex,
      poolIndex: team.poolIndex,
      members: team.players.flatMap((link) => {
        const user = link.gamePlayer?.user;
        return user ? [{ id: user.id, name: user.name }] : [];
      }),
    })),
    matches: row.matches,
  });
  const pool = tables?.pools.find(
    (item) => item.poolIndex === tables.viewerPoolIndex,
  );
  if (!pool) {
    return null;
  }
  const viewerRow = pool.rows.find((item) => item.isViewer);
  return {
    poolLabel: poolLetter(pool.poolIndex),
    poolSize: pool.rows.length,
    viewerPosition: viewerRow?.played != null ? viewerRow.position : null,
    lastResult: lastSettledRound(pool.viewerRounds),
  };
}

function lastSettledRound(
  rounds: readonly ViewerRoundResult[],
): HubListPoolMatch["lastResult"] {
  const settled = rounds.flatMap(
    (round): NonNullable<HubListPoolMatch["lastResult"]>[] => {
      if (round.roundNumber == null) {
        return [];
      }
      if (round.cancelled) {
        return [
          {
            roundNumber: round.roundNumber,
            outcome: "cancelled",
            viewerSets: [],
          },
        ];
      }
      if (round.viewerOutcome == null) {
        return [];
      }
      return [
        {
          roundNumber: round.roundNumber,
          outcome: round.viewerOutcome,
          viewerSets: round.sets.flatMap((set) =>
            set.viewerGamesWon != null && set.opponentGamesWon != null
              ? [{ viewer: set.viewerGamesWon, opponent: set.opponentGamesWon }]
              : [],
          ),
        },
      ];
    },
  );
  return settled[settled.length - 1] ?? null;
}

function knockoutRoundCount(row: HubQueryRow) {
  let max = 0;
  for (const match of row.matches) {
    if (match.knockoutRound != null && match.knockoutRound > max) {
      max = match.knockoutRound;
    }
  }
  return max;
}

/**
 * My Games and the Home carousel expand a posted drawn tournament into one
 * row per open Pool Match or Knockout Match the viewer's Game team sits on
 * (ADR-0018, ADR-0020). A Knockout Match whose slot is still a placeholder
 * has no team of the viewer's in it, so it is not listed. Group home and
 * pickup keep calling `toHubListRow` only.
 */
export function expandDrawnTournamentHubRows(
  row: HubQueryRow,
  hubRow: HubListRow,
  viewerUserId: string,
): HubListRow[] {
  if (
    !isDrawnTournament(row.format, row.poolCount, row.tournamentShape) ||
    row.drawPostedAt == null
  ) {
    return [hubRow];
  }
  const mine = row.matches.filter(
    (match) =>
      isOpenMatch(match) && viewerSitsOnMatch(row, match, viewerUserId),
  );
  if (mine.length === 0) {
    return [hubRow];
  }
  const withPools = hasPools(row.format, row.poolCount);
  const roundCount = withPools ? poolRoundCount(row) : null;
  const poolMatch = withPools ? viewerPoolMatch(row, viewerUserId) : null;
  const knockoutRounds = knockoutRoundCount(row);
  return [...mine]
    .sort((left, right) => {
      const leftTime = left.startTime?.getTime() ?? 0;
      const rightTime = right.startTime?.getTime() ?? 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.id.localeCompare(right.id);
    })
    .map((match) => {
      const sides = sidesFromMatch(row, match, viewerUserId);
      const registeredUserCount = sides.reduce(
        (count, side) => count + (side.left ? 1 : 0) + (side.right ? 1 : 0),
        0,
      );
      const knockoutMatch =
        match.knockoutRound != null
          ? { round: match.knockoutRound, roundCount: knockoutRounds }
          : null;
      return {
        ...hubRow,
        startTime: match.startTime ?? hubRow.startTime,
        matchId: match.id,
        roundNumber: knockoutMatch ? null : match.roundNumber,
        roundCount: knockoutMatch ? null : roundCount,
        courtName: match.court?.name ?? null,
        sides,
        registeredUserCount,
        playersAllowed: 4,
        canRegister: false,
        canWaitlist: false,
        poolMatch: knockoutMatch ? null : poolMatch,
        knockoutMatch,
      };
    });
}

export function sortExpandedHubListRows(rows: HubListRow[]) {
  return [...rows].sort((left, right) => {
    const leftIn = left.isRegistered || left.isSeated || left.isWaitlisted;
    const rightIn = right.isRegistered || right.isSeated || right.isWaitlisted;
    if (leftIn !== rightIn) {
      return leftIn ? -1 : 1;
    }
    const byTime = left.startTime.getTime() - right.startTime.getTime();
    if (byTime !== 0) {
      return byTime;
    }
    return (left.matchId ?? left.id).localeCompare(right.matchId ?? right.id);
  });
}

export async function applyViewerLevelRangeToHubRows(
  database: HubListDb,
  rows: HubListRow[],
  games: Array<{
    id: string;
    sport: string | null;
    createdBy: string;
    groupId: string | null;
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
  }>,
  userId: string,
): Promise<HubListRow[]> {
  const byId = new Map(games.map((game) => [game.id, game]));
  return Promise.all(
    rows.map(async (row) => {
      const game = byId.get(row.id);
      if (!game) {
        return row;
      }
      if (await userAllowedByLevelRange(database, game, userId)) {
        return row;
      }
      return {
        ...row,
        canRegister: false,
        canWaitlist: false,
      };
    }),
  );
}

export async function queryHubGames(
  database: HubListDb,
  where: SQL | undefined,
) {
  return database.query.games.findMany({
    where,
    columns: hubListColumns,
    with: hubListWith,
  });
}
