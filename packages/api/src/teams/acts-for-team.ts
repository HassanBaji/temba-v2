import type { DbClient, DbTx } from "@repo/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { groups, teamMembers, teams } from "@repo/db";
import { teamIsSquad } from "@repo/domain/team-roster";

import {
  appointedOrganizerGroupIds,
  appointedOrganizerUserIds,
} from "#src/groups/helpers/appointed-organizers";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";

type DbOrTx = DbClient | DbTx;

export type TeamForActing = Pick<
  typeof teams.$inferSelect,
  "id" | "sport" | "createdBy" | "groupId"
>;

async function taggedGroup(database: DbOrTx, team: TeamForActing) {
  if (!team.groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: and(eq(groups.id, team.groupId), isNull(groups.deletedAt)),
    columns: { id: true, createdBy: true },
  });
  return group ?? null;
}

/**
 * Who may use a Team's Challenge doors. Padel: both members. Football: the
 * Captain, plus the Organizers of the Group the Team is tagged to.
 */
export async function userActsForTeam(
  database: DbOrTx,
  team: TeamForActing,
  userId: string,
) {
  if (!teamIsSquad(team.sport)) {
    const membership = await database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, userId),
      ),
      columns: { id: true },
    });
    return Boolean(membership);
  }
  if (team.createdBy === userId) {
    return true;
  }
  const group = await taggedGroup(database, team);
  return group ? mayOrganizeGroupGames(database, group, userId) : false;
}

/** The audience told about a Team's Challenges: everyone who acts for it. */
export async function actingUserIds(
  database: DbOrTx,
  team: TeamForActing,
): Promise<string[]> {
  if (!teamIsSquad(team.sport)) {
    const rows = await database.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, team.id),
      columns: { userId: true },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });
    return rows.map((row) => row.userId);
  }
  const group = await taggedGroup(database, team);
  if (!group) {
    return [team.createdBy];
  }
  return [
    ...new Set([
      team.createdBy,
      group.createdBy,
      ...(await appointedOrganizerUserIds(database, group)),
    ]),
  ];
}

/**
 * Every Team the User acts for, oldest first: padel Teams they are on, and
 * football Teams they captain or whose tagged Group they organize.
 */
export async function teamsUserActsFor(database: DbOrTx, userId: string) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const memberTeamIds = new Set(memberships.map((row) => row.teamId));
  const appointedIds = await appointedOrganizerGroupIds(database, userId);
  const organized = await database.query.groups.findMany({
    where: and(
      isNull(groups.deletedAt),
      appointedIds.length > 0
        ? or(eq(groups.createdBy, userId), inArray(groups.id, appointedIds))
        : eq(groups.createdBy, userId),
    ),
    columns: { id: true },
  });
  const organizedIds = new Set(organized.map((group) => group.id));
  if (memberTeamIds.size === 0 && organizedIds.size === 0) {
    return [];
  }
  const candidates = await database.query.teams.findMany({
    where: or(
      memberTeamIds.size > 0
        ? inArray(teams.id, [...memberTeamIds])
        : undefined,
      organizedIds.size > 0
        ? inArray(teams.groupId, [...organizedIds])
        : undefined,
    ),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  return candidates.filter((team) =>
    teamIsSquad(team.sport)
      ? team.createdBy === userId ||
        (team.groupId != null && organizedIds.has(team.groupId))
      : memberTeamIds.has(team.id),
  );
}
