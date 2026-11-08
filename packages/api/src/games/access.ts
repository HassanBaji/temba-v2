import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import {
  challengeProposals,
  challenges,
  gamePlayers,
  games,
  gameTeams,
  gameWaitlist,
  groupMembers,
  groups,
  teamMembers,
  teams,
} from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { appointedOrganizerUserIds } from "#src/groups/helpers/appointed-organizers";
import { groupApproverUserIds } from "#src/groups/helpers/is-group-approver";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import type { RegistrationStatus } from "#src/games/utils";
import {
  actingUserIds,
  type TeamForActing,
  userActsForTeam,
} from "#src/teams/acts-for-team";

export type { RegistrationStatus };

type DbOrTx = DbClient | DbTx;

export const FRIENDLY_PLAYERS_ALLOWED = 4;
export const FRIENDLY_TEAMS_ALLOWED = 2;

export type GameRow = typeof games.$inferSelect;

export async function requireGame(database: DbOrTx, gameId: string) {
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
  database: DbOrTx,
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

type GroupForOrganize = {
  id: string;
  createdBy: string;
};

export async function mayCreateGameOnGroup(
  database: DbOrTx,
  group: GroupForOrganize,
  userId: string,
) {
  return mayOrganizeGroupGames(database, group, userId);
}

export async function assertMayCreateGameOnGroup(
  database: DbOrTx,
  group: GroupForOrganize,
  userId: string,
) {
  if (await mayOrganizeGroupGames(database, group, userId)) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Only the Group creator or an Organizer can create a Game on this Group",
  });
}

type GameForOrganizer = Pick<GameRow, "createdBy" | "groupId" | "challengeId">;

/** The two Teams of a Challenge Game: the poster's and the confirmed proposer's. */
export async function challengeGameTeams(
  database: DbOrTx,
  challengeId: string,
): Promise<TeamForActing[]> {
  const challenge = await database.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    columns: { teamId: true, confirmedProposalId: true },
  });
  if (!challenge) {
    return [];
  }
  const proposal = challenge.confirmedProposalId
    ? await database.query.challengeProposals.findFirst({
        where: eq(challengeProposals.id, challenge.confirmedProposalId),
        columns: { teamId: true },
      })
    : undefined;
  const teamIds = [challenge.teamId, ...(proposal ? [proposal.teamId] : [])];
  const rows = await database.query.teams.findMany({
    where: inArray(teams.id, teamIds),
    columns: { id: true, sport: true, createdBy: true, groupId: true },
  });
  return teamIds.flatMap((teamId) => {
    const team = rows.find((row) => row.id === teamId);
    return team ? [team] : [];
  });
}

/**
 * Who organizes a Game. On a Challenge Game, whoever acts for either Team;
 * on a Group Game, the Group creator or an Appointed Organizer; otherwise its
 * creator.
 */
export async function isGameOrganizer(
  database: DbOrTx,
  game: GameForOrganizer,
  userId: string,
) {
  if (game.challengeId) {
    for (const team of await challengeGameTeams(database, game.challengeId)) {
      if (await userActsForTeam(database, team, userId)) {
        return true;
      }
    }
    return false;
  }
  if (!game.groupId) {
    return game.createdBy === userId;
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, createdBy: true },
  });
  if (!group) {
    return false;
  }
  return mayOrganizeGroupGames(database, group, userId);
}

/**
 * The Game admin audience: who hears about a Game, never who may act on it.
 * On a Challenge Game, whoever acts for either Team. On a Group Game, the
 * Group approvers plus the Appointed Organizers.
 */
export async function gameAdminUserIds(
  database: DbOrTx,
  game: GameForOrganizer,
): Promise<string[]> {
  if (game.challengeId) {
    const ids: string[] = [];
    for (const team of await challengeGameTeams(database, game.challengeId)) {
      ids.push(...(await actingUserIds(database, team)));
    }
    return [...new Set(ids)];
  }
  if (!game.groupId) {
    return [game.createdBy];
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, game.groupId),
    columns: { id: true, createdBy: true },
  });
  if (!group) {
    return [];
  }
  const approverIds = await groupApproverUserIds(database, group);
  return [
    ...new Set([
      ...approverIds,
      ...(await appointedOrganizerUserIds(database, group)),
    ]),
  ];
}

export async function assertGameOrganizer(
  database: DbOrTx,
  game: GameRow,
  userId: string,
) {
  if (await isGameOrganizer(database, game, userId)) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only an organizer can do that",
  });
}

/**
 * A Challenge Game's sides are the two Teams and its shape is the
 * Challenge's: no admit, Waitlist, Invite door, kick, publish or shape edit.
 */
export function requireNotChallengeGame(
  game: Pick<GameRow, "challengeId">,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.challengeId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).challenge.errors.setByChallenge,
    });
  }
}

/** Any Roster member of either Team on a Challenge Game, named to a squad or not. */
async function isChallengeRosterMember(
  database: DbOrTx,
  challengeId: string,
  userId: string,
) {
  const teamIds = (await challengeGameTeams(database, challengeId)).map(
    (team) => team.id,
  );
  if (teamIds.length === 0) {
    return false;
  }
  const membership = await database.query.teamMembers.findFirst({
    where: and(
      inArray(teamMembers.teamId, teamIds),
      eq(teamMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return Boolean(membership);
}

export async function userPassesJoinGate(
  database: DbOrTx,
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
  database: DbOrTx,
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
  database: DbOrTx,
  game: GameRow,
  userId: string,
) {
  if (await isGameOrganizer(database, game, userId)) {
    return true;
  }
  if (game.groupId && (await isGroupMember(database, game.groupId, userId))) {
    return true;
  }
  if (
    game.challengeId &&
    (await isChallengeRosterMember(database, game.challengeId, userId))
  ) {
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

  return game.isPublic;
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

export function assertRegistrationOpen(game: GameRow, now: Date) {
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
}

type RegistrationStatusGame = {
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  windowEnd: Date | null;
  registrationMode: string;
  playersAllowed: number | null;
  teamsAllowed: number | null;
};

export function registrationStatusFromState(
  game: RegistrationStatusGame,
  now: Date,
  userCount: number,
  teamCount: number,
): RegistrationStatus {
  if (game.cancelledAt) {
    return "cancelled";
  }
  if (
    game.registrationClosedAt != null ||
    (game.windowEnd != null && game.windowEnd.getTime() < now.getTime())
  ) {
    return "closed";
  }
  if (game.registrationMode === "team_only") {
    if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
      return "full";
    }
    return "open";
  }
  if (userCount >= (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED)) {
    return "full";
  }
  return "open";
}

export async function getRegistrationStatus(
  database: DbOrTx,
  game: GameRow,
  now: Date,
): Promise<RegistrationStatus> {
  if (game.cancelledAt) {
    return "cancelled";
  }
  if (!isRegistrationOpen(game, now)) {
    return "closed";
  }
  const userCount = await registeredUserCount(database, game.id);
  const teamCount = await registeredGameTeamCount(database, game.id);
  return registrationStatusFromState(game, now, userCount, teamCount);
}

export async function registeredUserCount(database: DbOrTx, gameId: string) {
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { id: true },
  });
  return rows.length;
}

export async function registeredGameTeamCount(
  database: DbOrTx,
  gameId: string,
) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true },
  });
  return rows.length;
}
