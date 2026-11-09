import type { DbClient } from "@repo/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { teamMemberInvites, teamMembers, type GroupSportEnum } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";

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

  const teamIds = [...new Set(rows.map((row) => row.team.id))];
  const memberRows =
    teamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, teamIds),
          columns: { teamId: true },
        });

  return rows.map((row) => ({
    id: row.id,
    teamId: row.team.id,
    displayName: teamDisplayName(row.team.name, [row.invitedBy.name]),
    sport: row.team.sport as GroupSportEnum,
    rosterCount: memberRows.filter((member) => member.teamId === row.team.id)
      .length,
    invitedBy: {
      id: row.invitedBy.id,
      name: row.invitedBy.name,
      email: row.invitedBy.email,
      image: row.invitedBy.image,
    },
    createdAt: row.createdAt,
  }));
}

export const pendingInvitesProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingInvites(ctx.db, { userId: appUser.id });
  },
);
