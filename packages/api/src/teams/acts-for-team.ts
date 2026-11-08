import type { DbClient, DbTx } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";

import { groups, teamMembers, type teams } from "@repo/db";
import { teamIsSquad } from "@repo/domain/team-roster";

import { mayOrganizeGroupGames } from "#src/games/access";
import { appointedOrganizerUserIds } from "#src/groups/helpers/appointed-organizers";

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
