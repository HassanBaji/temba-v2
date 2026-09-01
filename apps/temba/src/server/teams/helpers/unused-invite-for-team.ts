import { and, eq, isNull } from "drizzle-orm";

import { teamMemberInvites } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function unusedInviteForTeam(database: DbClient, teamId: string) {
  return database.query.teamMemberInvites.findFirst({
    where: and(
      eq(teamMemberInvites.teamId, teamId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
