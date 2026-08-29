import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  gamePlayers,
  games,
  gameTeams,
  gameWaitlist,
  groupMembers,
  groups,
  teamMembers,
} from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const FRIENDLY_PLAYERS_ALLOWED = 4;
export const FRIENDLY_TEAMS_ALLOWED = 2;

export type GameRow = typeof games.$inferSelect;

export function isStaffRole(role: string | null | undefined) {
  return role === CommunityRoleEnum.OWNER || role === CommunityRoleEnum.ADMIN;
}

export async function requireGame(database: DbClient, gameId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.id, gameId),
  });
  if (!game) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found",
    });
  }
  return game;
}

export async function isGroupMember(
  database: DbClient,
  groupId: string,
  userId: string,
) {
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return Boolean(membership);
}

async function clubCommunity(database: DbClient, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, communityId: true },
  });
  if (!group?.communityId) {
    return null;
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { id: true, archivedAt: true },
  });
  return community ?? null;
}

export async function mayCreateGameOnGroup(
  database: DbClient,
  group: typeof groups.$inferSelect,
  userId: string,
) {
  if (group.communityId) {
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
      columns: { archivedAt: true },
    });
    if (community?.archivedAt) {
      return false;
    }
    const membership = await database.query.communityMembers.findFirst({
      where: and(
        eq(communityMembers.communityId, group.communityId),
        eq(communityMembers.userId, userId),
      ),
      columns: { role: true },
    });
    return isStaffRole(membership?.role);
  }

  return isGroupMember(database, group.id, userId);
}

export async function assertMayCreateGameOnGroup(
  database: DbClient,
  group: typeof groups.$inferSelect,
  userId: string,
) {
  if (group.communityId) {
    const community = await database.query.communities.findFirst({
      where: eq(communities.id, group.communityId),
      columns: { archivedAt: true },
    });
    if (community?.archivedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Cannot create a Club Group Game while the Community is archived",
      });
    }
    const membership = await database.query.communityMembers.findFirst({
      where: and(
        eq(communityMembers.communityId, group.communityId),
        eq(communityMembers.userId, userId),
      ),
      columns: { role: true },
    });
    if (!isStaffRole(membership?.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Owner or Admin can create a Club Group Game",
      });
    }
    return;
  }

  if (!(await isGroupMember(database, group.id, userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a Group member to create a Game on this Group",
    });
  }
}

export async function isGameOrganizer(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (!game.groupId) {
    return game.createdBy === userId;
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, communityId: true },
  });
  if (!group) {
    return false;
  }
  if (group.communityId) {
    const membership = await database.query.communityMembers.findFirst({
      where: and(
        eq(communityMembers.communityId, group.communityId),
        eq(communityMembers.userId, userId),
      ),
      columns: { role: true },
    });
    return isStaffRole(membership?.role);
  }
  return isGroupMember(database, group.id, userId);
}

export async function userPassesJoinGate(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (game.isPublic) {
    return true;
  }
  if (game.groupId) {
    return isGroupMember(database, game.groupId, userId);
  }
  return game.createdBy === userId;
}

export async function assertUserPassesJoinGate(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (await userPassesJoinGate(database, game, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: game.groupId
      ? "Only Group members can register on this Game"
      : "Only the organizer can register on this Game",
  });
}

export async function canViewGame(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (await isGameOrganizer(database, game, userId)) {
    return true;
  }
  if (game.groupId && (await isGroupMember(database, game.groupId, userId))) {
    return true;
  }

  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  if (player) {
    return true;
  }

  const waitlisted = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, game.id),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  if (waitlisted) {
    return true;
  }

  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const teamIds = memberships.map((row) => row.teamId);
  if (teamIds.length > 0) {
    const teamWaitlisted = await database.query.gameWaitlist.findFirst({
      where: and(
        eq(gameWaitlist.gameId, game.id),
        inArray(gameWaitlist.teamId, teamIds),
      ),
      columns: { id: true },
    });
    if (teamWaitlisted) {
      return true;
    }
  }

  if (game.isPublic) {
    if (game.groupId) {
      const community = await clubCommunity(database, game.groupId);
      if (community?.archivedAt) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function isRegistrationOpen(game: GameRow, now: Date) {
  if (game.cancelledAt) {
    return false;
  }
  if (game.registrationClosedAt) {
    return false;
  }
  if (game.windowEnd && game.windowEnd.getTime() < now.getTime()) {
    return false;
  }
  return true;
}

export async function isClubGroupGameJoinFrozen(
  database: DbClient,
  game: GameRow,
) {
  if (!game.groupId) {
    return false;
  }
  const community = await clubCommunity(database, game.groupId);
  return Boolean(community?.archivedAt);
}

export async function assertRegistrationOpen(
  database: DbClient,
  game: GameRow,
  now: Date,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
  if (!isRegistrationOpen(game, now)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
  if (game.groupId) {
    const community = await clubCommunity(database, game.groupId);
    if (community?.archivedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This Game is not open for registration",
      });
    }
  }
}

export type RegistrationStatus = "open" | "full" | "closed" | "cancelled";

export async function getRegistrationStatus(
  database: DbClient,
  game: GameRow,
  now: Date,
): Promise<RegistrationStatus> {
  if (game.cancelledAt) {
    return "cancelled";
  }
  if (
    !isRegistrationOpen(game, now) ||
    (await isClubGroupGameJoinFrozen(database, game))
  ) {
    return "closed";
  }
  const userCount = await registeredUserCount(database, game.id);
  const teamCount = await registeredGameTeamCount(database, game.id);
  if (game.registrationMode === "team_only") {
    if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
      return "full";
    }
    return "open";
  }
  if (userCount >= (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED)) {
    return "full";
  }
  if (game.format === "friendly_game" && teamCount >= FRIENDLY_TEAMS_ALLOWED) {
    return "full";
  }
  return "open";
}

export async function registeredUserCount(database: DbClient, gameId: string) {
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { id: true },
  });
  return rows.length;
}

export async function registeredGameTeamCount(
  database: DbClient,
  gameId: string,
) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true },
  });
  return rows.length;
}
