import { eq } from "drizzle-orm";

import { teamMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listTeamMembers(database: DbClient, teamId: string) {
  return database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}
