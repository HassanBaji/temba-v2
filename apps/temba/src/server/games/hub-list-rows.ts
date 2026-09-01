import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";

import {
  games,
  groupMembers,
  teamMembers,
  type GameFormatEnum,
  type GameRegistrationModeEnum,
  type GameSportEnum,
} from "@repo/db";

import {
  registrationStatusFromState,
  type RegistrationStatus,
} from "~/server/games/access";
import { type db } from "~/server/db";
import {
  filterAndSortMyGroupsHubGames,
  filterAndSortPublicHubGames,
  gameListTime,
} from "~/server/home/upcoming-games";
import { consult } from "~/server/soft-archive";

type DbClient = typeof db;

export type HubListSideOccupant = {
  userId: string;
  name: string;
  image: string | null;
};

export type HubListSide = {
  sideIndex: number;
  left: HubListSideOccupant | null;
  right: HubListSideOccupant | null;
};

export type HubListRow = {
  id: string;
  name: string | null;
  format: GameFormatEnum | string;
  registrationMode: GameRegistrationModeEnum | string;
  sport: GameSportEnum | string | null;
  isPublic: boolean;
  groupId: string | null;
  groupName: string | null;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { id: string; name: string; city: string } | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  registeredTeamCount: number;
  teamsAllowed: number | null;
  registrationStatus: RegistrationStatus;
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  canRegister: boolean;
  canWaitlist: boolean;
  sides: HubListSide[];
};

const hubListColumns = {
  id: true,
  name: true,
  isPublic: true,
  groupId: true,
  venueId: true,
  windowStart: true,
  windowEnd: true,
  cancelledAt: true,
  registrationClosedAt: true,
  createdAt: true,
  createdBy: true,
  format: true,
  registrationMode: true,
  sport: true,
  playersAllowed: true,
  teamsAllowed: true,
} as const;

const hubListWith = {
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
      startTime: true,
      status: true,
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

type HubQueryRow = {
  id: string;
  name: string | null;
  isPublic: boolean;
  groupId: string | null;
  venueId: string;
  windowStart: Date | null;
  windowEnd: Date | null;
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  format: string;
  registrationMode: string;
  sport: string | null;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  group: {
    id: string;
    communityId: string | null;
    name: string;
    community: { archivedAt: Date | null } | null;
  } | null;
  venue: { id: string; name: string; city: string } | null;
  matches: { startTime: Date | null; status: string | null }[];
  players: { id: string; userId: string | null }[];
  waitlist: { userId: string | null; teamId: string | null }[];
  teams: {
    id: string;
    sideIndex: number | null;
    players: {
      position: "left" | "right" | null;
      gamePlayer: {
        user: { id: string; name: string; image: string | null } | null;
      } | null;
    }[];
  }[];
};

async function viewerHubContext(database: DbClient, userId: string) {
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
): HubListSideOccupant | null {
  const user = link.gamePlayer?.user;
  if (!user) {
    return null;
  }
  return {
    userId: user.id,
    name: user.name,
    image: user.image,
  };
}

function sidesFromRow(row: HubQueryRow): HubListSide[] {
  if (row.format !== "friendly_game" || row.registrationMode !== "individual") {
    return [];
  }
  const bySide = new Map<number, HubQueryRow["teams"][number]>();
  for (const team of row.teams) {
    if (team.sideIndex != null) {
      bySide.set(team.sideIndex, team);
    }
  }
  const sides: HubListSide[] = [];
  for (let sideIndex = 1; sideIndex <= 2; sideIndex += 1) {
    const team = bySide.get(sideIndex);
    let left: HubListSideOccupant | null = null;
    let right: HubListSideOccupant | null = null;
    if (team) {
      for (const link of team.players) {
        const occupant = occupantFromLink(link);
        if (!occupant) {
          continue;
        }
        if (link.position === "left") {
          left = occupant;
        } else if (link.position === "right") {
          right = occupant;
        }
      }
    }
    sides.push({ sideIndex, left, right });
  }
  return sides;
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
      registrationStatus === "full" &&
      passesGate &&
      !isRegistered &&
      !isWaitlisted,
    sides: sidesFromRow(row),
  };
}

async function queryHubGames(database: DbClient, where: SQL | undefined) {
  return database.query.games.findMany({
    where,
    columns: hubListColumns,
    with: hubListWith,
  });
}

export async function listMyGroupsHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId);
  if (viewer.memberGroupIds.size === 0) {
    return [];
  }
  const rows = await queryHubGames(
    database,
    and(
      inArray(games.groupId, [...viewer.memberGroupIds]),
      isNull(games.cancelledAt),
    ),
  );
  return filterAndSortMyGroupsHubGames(
    rows as HubQueryRow[],
    viewer.memberGroupIds,
    now,
  ).map((row) => toHubListRow(row, viewer, now));
}

export async function listPublicHubRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<HubListRow[]> {
  const viewer = await viewerHubContext(database, userId);
  const rows = await queryHubGames(
    database,
    and(eq(games.isPublic, true), isNull(games.cancelledAt)),
  );
  return filterAndSortPublicHubGames(
    (rows as HubQueryRow[]).map((row) => ({
      ...row,
      communityArchivedAt: row.group?.community?.archivedAt ?? null,
    })),
    viewer.memberGroupIds,
    now,
  ).map((row) => toHubListRow(row, viewer, now));
}
