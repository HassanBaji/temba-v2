import { and, eq, isNull } from "drizzle-orm";

import { teamMemberInvites, type GroupSportEnum } from "@repo/db";

import { teamDisplayName } from "~/server/teams/helpers/team-display-name";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function pendingInvites(
  database: DbClient,
  args: { userId: string },
) {
  const rows = await database.query.teamMemberInvites.findMany({
    where: and(
      eq(teamMemberInvites.userId, args.userId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    with: {
      team: true,
      invitedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    teamId: row.team.id,
    displayName: teamDisplayName(row.team.name, [row.invitedBy.name]),
    sport: row.team.sport as GroupSportEnum,
    invitedBy: {
      id: row.invitedBy.id,
      name: row.invitedBy.name,
      email: row.invitedBy.email,
      image: row.invitedBy.image,
    },
    createdAt: row.createdAt,
  }));
}
